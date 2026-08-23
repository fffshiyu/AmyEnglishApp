/* eslint-disable */
// ============================================================================
// Api — the single seam between app.js and storage.
//
// app.js must never touch localStorage, IndexedDB, or Cloud directly. It talks
// only to Api.*, which carries BUSINESS semantics ("save this check-in"), not
// storage semantics ("write this JSON blob").
//
// Two layers:
//   Api    — business surface. Signatures stay fixed when the backend changes.
//   Store  — the v1 local implementation (localStorage + IndexedDB + cloud.js).
//
// When the Cloudflare backend lands, only Store changes:
//   Store.blob      -> GET/POST /api/bootstrap        (D1)
//   Store.rec       -> PUT /api/recordings            (R2 + D1)
//   CloudSync.*     -> deleted; D1 rows make the merge unnecessary
//
// EVERY method is async, even where the v1 implementation is synchronous.
// That is deliberate: it is the whole point of this layer. Crossing the
// sync->async boundary now, while behaviour is unchanged and verifiable, is
// far cheaper than doing it later on top of new backend code.
//
// Rendering never awaits Api. app.js keeps App.state as the in-memory source
// of truth for rendering; Api writes are fire-and-forget behind it.
// ============================================================================

const TEACHER_PHONE = '13259532991';

// ---------------------------------------------------------------------------
// uid — client-generated ids so the Worker can dedupe retries later.
// A flaky mobile network means the same check-in may be POSTed twice; without
// a client id the server cannot tell a retry from a second attempt.
// ---------------------------------------------------------------------------
function uid() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch (e) {}
  return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ===========================================================================
// Store.blob — the eng_hw_v6 document (localStorage today, D1 tomorrow)
// ===========================================================================
const Store = {
  KEY: 'eng_hw_v6',
  LEGACY: ['eng_hw_v5', 'eng_hw_v4'],
  LOGIN_KEY: 'amy_saved_login',
  WORDS_KEY: 'amy_learned_words',

  // The canonical document. Api holds this; App.state is a view onto it.
  _doc: null,

  _empty() {
    return {
      answers: {}, checkins: {}, errorBook: [],
      students: [], parentStudents: {}, classes: [],
    };
  },

  // Refill the existing collections in place instead of swapping in new ones.
  // App.state.checkins and friends hold these exact objects; replacing them
  // would leave the renderers reading a detached copy and silently showing
  // stale (usually empty) data.
  _adopt(target, source) {
    if (target === source) return target;   // self-adopt would empty it
    Object.keys(source).forEach(field => {
      const from = source[field];
      const to = target[field];
      if (Array.isArray(to) && Array.isArray(from)) {
        to.length = 0;
        from.forEach(v => to.push(v));
      } else if (to && from && typeof to === 'object' && typeof from === 'object') {
        Object.keys(to).forEach(k => delete to[k]);
        Object.keys(from).forEach(k => { to[k] = from[k]; });
      } else {
        target[field] = from;
      }
    });
    return target;
  },

  // Read the document, migrating v5/v4 exactly as loadData() used to.
  read() {
    const doc = this._empty();
    try {
      const saved = localStorage.getItem(this.KEY);
      if (saved) {
        const d = JSON.parse(saved);
        doc.answers = d.answers || {};
        doc.checkins = d.checkins || {};
        doc.errorBook = d.errorBook || [];
        doc.students = d.students || [];
        doc.parentStudents = d.parentStudents || {};
        doc.classes = d.classes || [];
      }
      // Migrate from an older version only when v6 produced no students.
      // Same order and same fields as the original loadData().
      let migrated = false;
      for (let i = 0; i < this.LEGACY.length && doc.students.length === 0; i++) {
        const raw = localStorage.getItem(this.LEGACY[i]);
        if (!raw) continue;
        const old = JSON.parse(raw);
        doc.students = old.students || [];
        doc.checkins = old.checkins || {};
        doc.parentStudents = old.parentStudents || {};
        doc.classes = old.classes || [];
        migrated = migrated || doc.students.length > 0;
      }
      if (doc.classes.length === 0 && doc.students.length > 0) {
        doc.classes = ['未分班'];
      }
      // Keep collection identity stable across re-reads (see _adopt), then
      // persist a migration immediately. app.js used to get that flush for
      // free from a saveData() on the login path; that call is gone, so
      // without it a migrated teacher would stay on v5 until their next write.
      this._doc = this._doc ? this._adopt(this._doc, doc) : doc;
      if (migrated) this.flush();
      return this._doc;
    } catch (e) { console.warn('Store.read error:', e); }
    this._doc = this._doc ? this._adopt(this._doc, doc) : doc;
    return this._doc;
  },

  doc() {
    return this._doc || this.read();
  },

  // Persist the whole document. v1 only — each Api write method flushes here.
  // Under D1 these become individual statements and this disappears.
  //
  // Cross-tab safety: a whole-document write blindly overwrites whatever
  // another tab (installed PWA + browser tab is the common case) wrote since
  // we loaded. answers and checkins are append-mostly keyed maps, so we union
  // in any keys the on-disk copy has that we do not, and let ours win on a
  // genuine conflict. Without this, a second tab sitting on a stale snapshot
  // silently erases a child's work on its next 15s sync poll.
  flush() {
    try {
      const d = this.doc();
      let onDisk = null;
      try { onDisk = JSON.parse(localStorage.getItem(this.KEY) || 'null'); } catch (e) {}
      if (onDisk) {
        ['answers', 'checkins'].forEach(field => {
          const theirs = onDisk[field];
          if (!theirs) return;
          Object.keys(theirs).forEach(k => { if (!d[field][k]) d[field][k] = theirs[k]; });
        });
      }
      localStorage.setItem(this.KEY, JSON.stringify({
        answers: d.answers,
        checkins: d.checkins,
        errorBook: d.errorBook,
        students: d.students,
        parentStudents: d.parentStudents,
        classes: d.classes,
      }));
      return true;
    } catch (e) { console.warn('Store.flush error:', e); return false; }
  },

  readLogin() {
    try {
      const raw = localStorage.getItem(this.LOGIN_KEY);
      if (!raw) return null;
      const creds = JSON.parse(raw);
      return (creds && creds.phone && creds.name) ? creds : null;
    } catch (e) { return null; }
  },

  writeLogin(phone, name) {
    try { localStorage.setItem(this.LOGIN_KEY, JSON.stringify({ phone: phone, name: name })); } catch (e) {}
  },

  clearLogin() {
    try { localStorage.removeItem(this.LOGIN_KEY); } catch (e) {}
  },

  readWords() {
    try { return JSON.parse(localStorage.getItem(this.WORDS_KEY) || '{}'); } catch (e) { return {}; }
  },

  writeWords(map) {
    try { localStorage.setItem(this.WORDS_KEY, JSON.stringify(map)); } catch (e) {}
  },
};

// ===========================================================================
// Store.rec — recordings and speaking scores (IndexedDB today, R2 + D1 later)
//
// Audio never goes in localStorage: 45 students x 5 questions x 3 speaking
// days is ~675 clips a week, far past the 5MB quota. IndexedDB holds Blobs
// natively and has no practical size ceiling here.
// ===========================================================================
const RecStore = {
  DB: 'amy_media', VER: 1,
  CLIPS: 'clips', SCORES: 'scores',
  _db: null,

  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((resolve, reject) => {
      let req;
      try { req = indexedDB.open(this.DB, this.VER); }
      catch (e) { reject(e); return; }
      req.onupgradeneeded = (ev) => {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains(this.CLIPS)) {
          const s = db.createObjectStore(this.CLIPS, { keyPath: 'id' });
          s.createIndex('byStudentDay', ['studentId', 'dayIdx']);
        }
        if (!db.objectStoreNames.contains(this.SCORES)) {
          const s = db.createObjectStore(this.SCORES, { keyPath: 'id' });
          s.createIndex('byStudentDay', ['studentId', 'dayIdx']);
        }
      };
      req.onsuccess = () => { this._db = req.result; resolve(this._db); };
      req.onerror = () => reject(req.error);
    });
  },

  _tx(store, mode, fn) {
    return this.open().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.onerror = () => reject(tx.error);
      if (req) { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }
      else { tx.oncomplete = () => resolve(); }
    }));
  },

  put(store, rec) { return this._tx(store, 'readwrite', s => s.put(rec)); },
  get(store, id) { return this._tx(store, 'readonly', s => s.get(id)); },
  all(store) { return this._tx(store, 'readonly', s => s.getAll()); },
};

// ===========================================================================
// CloudSync — the two-way merge against cloud.js
//
// These ~130 lines came out of app.js verbatim. They exist ONLY because the
// backing store is one opaque JSON blob with no server-side logic: with no
// rows and no timestamps, the client has to reconcile field by field.
//
// When D1 lands this whole section is DELETED, not ported. A single UPDATE
// replaces it, and app.js does not change because it only ever called
// Api.syncUp() / Api.syncDown().
// ===========================================================================
const CloudSync = {
  available() { return typeof Cloud !== 'undefined'; },

  // Push local state up, merging with whatever is already in the cloud.
  async up(localStudents, localClasses) {
    if (!this.available()) return { ok: false, students: localStudents, classes: localClasses };

    const cloudData = await Cloud.loadAll();

    const mergedStudents = localStudents.slice();
    if (cloudData && cloudData.students) {
      cloudData.students.forEach(cs => {
        if (!cs || !cs.phone) return;
        const local = mergedStudents.find(s => s.phone === cs.phone);
        if (!local) {
          mergedStudents.push({
            id: cs.id || ('s' + cs.phone),
            name: cs.name,
            phone: cs.phone,
            parentPhone: cs.phone,
            class: cs.class || '',
            approved: cs.approved || false,
            registeredAt: cs.registeredAt || new Date().toISOString(),
          });
        } else {
          // Cloud is the source of truth for class/approved. Without this a
          // student device holding a stale record could wipe a class the
          // teacher just assigned.
          if (cs.class) local.class = cs.class;
          if (cs.approved) local.approved = cs.approved;
          if (cs.name) local.name = cs.name;
        }
      });
    }

    const mergedClasses = localClasses.slice();
    if (cloudData && cloudData.classes) {
      cloudData.classes.forEach(c => { if (c && !mergedClasses.includes(c)) mergedClasses.push(c); });
    }

    const payload = {
      students: mergedStudents.map(s => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        class: s.class || '',
        approved: s.approved || false,
        registeredAt: s.registeredAt || new Date().toISOString(),
      })),
      classes: mergedClasses,
      lastUpdated: new Date().toISOString(),
    };

    const ok = await Cloud.saveAll(payload);
    return { ok: ok, students: mergedStudents, classes: mergedClasses };
  },

  // Pull the cloud down, merging into the local collections IN PLACE so that
  // callers holding the same array reference see the update.
  async down(localStudents, localClasses) {
    if (!this.available()) return { ok: false, empty: true, unreachable: false };

    const cloudData = await Cloud.loadAll();
    if (!cloudData) {
      // Distinguish "cloud is empty" from "cloud unreachable": loadAll() only
      // sets lastError on a real network failure.
      const unreachable = !!(Cloud.lastError && Cloud.lastError.indexOf('网络') >= 0);
      return { ok: false, empty: true, unreachable: unreachable };
    }

    if (cloudData.students && Array.isArray(cloudData.students)) {
      cloudData.students.forEach(cs => {
        if (!cs || !cs.phone) return;
        const local = localStudents.find(s => s.phone === cs.phone);
        if (local) {
          local.name = cs.name || local.name;
          if (cs.class !== undefined) local.class = cs.class;
          if (cs.approved !== undefined) local.approved = cs.approved;
          local.registeredAt = cs.registeredAt || local.registeredAt;
        } else {
          localStudents.push({
            id: cs.id || ('s' + cs.phone),
            name: cs.name,
            phone: cs.phone,
            parentPhone: cs.phone,
            class: cs.class || '',
            approved: cs.approved || false,
            registeredAt: cs.registeredAt || new Date().toISOString(),
          });
        }
      });
    }

    if (cloudData.classes && Array.isArray(cloudData.classes)) {
      cloudData.classes.forEach(c => { if (c && !localClasses.includes(c)) localClasses.push(c); });
    }

    return { ok: true, empty: false, unreachable: false };
  },

  lastError() { return this.available() ? Cloud.lastError : null; },
};

// ===========================================================================
// Api — the public surface. app.js talks to this and nothing else.
// ===========================================================================
const Api = {

  // -- session ------------------------------------------------------------
  // Role resolution lives here, not in app.js. Today it is a phone-number
  // comparison; under Cloudflare it becomes a Worker call returning a real
  // token, and app.js does not change because it only reads session.role.
  session: null,

  async getSavedLogin() {
    return Store.readLogin();
  },

  async login(phone, name) {
    Store.writeLogin(phone, name);
    return this.resolveSession(phone, name);
  },

  async resolveSession(phone, name) {
    this.session = {
      phone: phone,
      name: name,
      role: phone === TEACHER_PHONE ? 'teacher' : 'student',
      token: null,       // Worker-issued later
      className: '',
    };
    return this.session;
  },

  async logout() {
    Store.clearLogin();
    this.session = null;
  },

  isTeacher() {
    return !!(this.session && this.session.role === 'teacher');
  },

  // -- assignments --------------------------------------------------------
  async getAssignments() {
    return typeof HOMEWORK_DATA !== 'undefined' ? HOMEWORK_DATA : [];
  },

  // -- bootstrap ----------------------------------------------------------
  // One read at startup. Becomes GET /api/bootstrap.
  // The returned collections are handed to App.state by reference: mutating
  // App.state.students mutates the document. That is a v1 shortcut which
  // keeps this refactor behaviour-identical; the write methods below are what
  // carry the real intent across to the backend.
  async loadState() {
    return Store.read();
  },

  // -- students / classes -------------------------------------------------
  async saveStudent(student) {                       // -> UPSERT students
    const d = Store.doc();
    const i = d.students.findIndex(s => s.id === student.id || s.phone === student.phone);
    if (i >= 0) d.students[i] = student; else d.students.push(student);
    return Store.flush();
  },

  async saveStudents(students) {                     // -> batched UPSERT
    Store.doc().students = students;
    return Store.flush();
  },

  // Returns the surviving list. Callers assign it back into App.state rather
  // than filtering separately, so the two never drift apart.
  async deleteStudent(student) {                     // -> DELETE FROM students
    const d = Store.doc();
    d.students = d.students.filter(s => s.id !== student.id && s.phone !== student.phone);
    delete d.parentStudents[student.phone];
    Store.flush();
    return d.students;
  },

  async saveClasses(classes) {                       // -> REPLACE classes
    Store.doc().classes = classes;
    return Store.flush();
  },

  async saveParentStudent(phone, rec) {
    Store.doc().parentStudents[phone] = rec;
    return Store.flush();
  },

  // -- answers and check-ins ----------------------------------------------
  // Key shapes match what the existing renderers already read, so no render
  // code has to learn a new format.
  answerKey(studentId, dayIdx, moduleIdx, qIdx) {
    return studentId + '_d' + dayIdx + '_m' + moduleIdx + '_q' + qIdx;
  },

  checkinKey(studentId, dayIdx) {
    return studentId + '_d' + dayIdx;
  },

  // First answer wins. Choice questions lock themselves after one tap, but a
  // fill-in box can be retyped; without this the accuracy rate is gameable.
  async saveAnswer(studentId, dayIdx, moduleIdx, qIdx, value, correct) {
    const d = Store.doc();
    const key = this.answerKey(studentId, dayIdx, moduleIdx, qIdx);
    if (d.answers[key]) return { recorded: false, record: d.answers[key] };
    const rec = {
      id: uid(),
      studentId: studentId, dayIdx: dayIdx, moduleIdx: moduleIdx, qIdx: qIdx,
      value: value, correct: !!correct,
      at: new Date().toISOString(),
    };
    d.answers[key] = rec;
    Store.flush();
    return { recorded: true, record: rec };
  },

  async getAnswers(studentId, dayIdx) {
    const d = Store.doc();
    const prefix = studentId + '_d' + dayIdx + '_';
    return Object.keys(d.answers)
      .filter(k => k.indexOf(prefix) === 0)
      .map(k => d.answers[k]);
  },

  // Written from the first answer of the day onward, recomputed after each.
  // done=true only once every question in the day has a record; before that
  // completed='partial', which the existing renderers already style.
  async saveCheckin(studentId, dayIdx, totalQuestions) {
    const d = Store.doc();
    const answered = await this.getAnswers(studentId, dayIdx);
    if (answered.length === 0) return null;

    const correct = answered.filter(a => a.correct).length;
    const full = totalQuestions > 0 && answered.length >= totalQuestions;
    const now = new Date();
    const key = this.checkinKey(studentId, dayIdx);
    const prev = d.checkins[key];

    const rec = {
      id: prev ? prev.id : uid(),
      studentId: studentId, dayIdx: dayIdx,
      done: full,
      completed: full ? 'full' : 'partial',
      answered: answered.length,
      total: totalQuestions,
      correctRate: Math.round(correct / answered.length * 100),
      wrongCount: answered.length - correct,
      time: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'),
      at: now.toISOString(),
    };
    d.checkins[key] = rec;
    Store.flush();
    return rec;
  },

  async getCheckin(studentId, dayIdx) {
    return Store.doc().checkins[this.checkinKey(studentId, dayIdx)] || null;
  },

  // -- vocabulary ---------------------------------------------------------
  // Read once at startup into App.state; the vocab renderer looks words up
  // synchronously while building HTML and cannot await.
  async getLearnedWords() {
    return Store.readWords();
  },

  async saveLearnedWords(dayIdx, words) {
    const map = Store.readWords();
    map['day_' + dayIdx] = words;
    Store.writeWords(map);
    return map;
  },

  // -- recordings ---------------------------------------------------------
  // Returns an opaque url. Today an object URL over an IndexedDB blob;
  // later a signed R2 url. Callers must not assume it is permanent.
  async uploadRecording(blob, meta) {
    const rec = Object.assign({
      id: uid(),
      at: new Date().toISOString(),
      mime: blob && blob.type ? blob.type : 'audio/webm',
      size: blob ? blob.size : 0,
    }, meta || {});
    try {
      await RecStore.put(RecStore.CLIPS, Object.assign({}, rec, { blob: blob }));
    } catch (e) {
      // IndexedDB unavailable (private mode, quota). Recording still plays
      // back this session via the object url; it just will not survive.
      console.warn('uploadRecording: persistence failed, session-only:', e);
    }
    return { id: rec.id, url: URL.createObjectURL(blob), meta: rec };
  },

  async getRecordings(filter) {
    let all = [];
    try { all = await RecStore.all(RecStore.CLIPS); } catch (e) { return []; }
    const f = filter || {};
    return all
      .filter(r => (f.studentId === undefined || r.studentId === f.studentId))
      .filter(r => (f.dayIdx === undefined || r.dayIdx === f.dayIdx))
      .map(r => ({ id: r.id, url: r.blob ? URL.createObjectURL(r.blob) : null, meta: r }));
  },

  // -- speaking scores ----------------------------------------------------
  async submitSpeakingScore(record) {
    const rec = Object.assign({ id: uid(), at: new Date().toISOString() }, record || {});
    try { await RecStore.put(RecStore.SCORES, rec); }
    catch (e) { console.warn('submitSpeakingScore failed:', e); }
    return rec;
  },

  async getSpeakingRecords(filter) {
    let all = [];
    try { all = await RecStore.all(RecStore.SCORES); } catch (e) { return []; }
    const f = filter || {};
    return all
      .filter(r => (f.studentId === undefined || r.studentId === f.studentId))
      .filter(r => (f.dayIdx === undefined || r.dayIdx === f.dayIdx));
  },

  // A student asking only "which class am I in?". Deliberately not syncDown:
  // it must not merge the whole roster onto a student's device.
  // Becomes GET /api/me once the Worker exists.
  async fetchMyAssignment(phone) {
    if (!CloudSync.available()) return null;
    try {
      const cloudData = await Cloud.loadAll();
      if (!cloudData || !cloudData.students) return null;
      const me = cloudData.students.find(s => s.phone === phone);
      return (me && me.class) ? { className: me.class } : null;
    } catch (e) { console.warn('fetchMyAssignment error:', e); return null; }
  },

  // -- speech recognition -------------------------------------------------
  // Posts 16kHz mono WAV to our own Worker, which calls Workers AI Whisper.
  // Deliberately NOT the browser's SpeechRecognition: that is Chrome-only and
  // streams the audio to Google, which is unreachable from the mainland.
  //
  // Recognition is an enhancement, never a dependency. Every caller must work
  // when this returns null: the clip is already saved locally by then, and the
  // teacher can listen regardless.
  // Same-origin when the app is served from amyeng.top — no CORS preflight,
  // which is one less round trip on a flaky connection. Anywhere else
  // (local dev, another host) falls back to the api. subdomain.
  API_HOST: 'https://api.amyeng.top',
  get TRANSCRIBE_URL() {
    const h = (typeof location !== 'undefined' && location.hostname) || '';
    const sameZone = h === 'amyeng.top' || h.endsWith('.amyeng.top');
    return (sameZone ? '' : this.API_HOST) + '/api/transcribe';
  },
  TRANSCRIBE_TIMEOUT: 12000,

  // Whisper emits stock phrases from its training data when it is handed
  // audio it cannot make sense of. Treating those as a real answer scores the
  // child 0 for something they may well have read correctly.
  // Only phrases that cannot plausibly be an answer. "you" and "bye" are real
  // words a child might be asked to read, so they stay off this list even
  // though Whisper also emits them as filler.
  FILLERS: ['thank you', 'thanks for watching', 'thanks for watching!',
            'subscribe', 'please subscribe', '. .', '...', '。'],

  isFillerTranscript(text) {
    if (!text) return true;
    const t = String(text).toLowerCase().replace(/[^a-z\s.]/g, '').trim();
    if (!t || t === '.') return true;
    return this.FILLERS.indexOf(t) >= 0 || this.FILLERS.indexOf(t.replace(/\.$/, '')) >= 0;
  },

  async transcribe(blob, meta) {
    if (!blob) return null;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), this.TRANSCRIBE_TIMEOUT) : null;
    try {
      const res = await fetch(this.TRANSCRIBE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav' },
        body: blob,
        signal: ctrl ? ctrl.signal : undefined,
      });
      if (timer) clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      return { text: (data.text || '').trim(), words: data.words || null };
    } catch (e) {
      if (timer) clearTimeout(timer);
      console.warn('transcribe failed:', e && e.name === 'AbortError' ? 'timeout' : e);
      // Park it so a later attempt can fill the transcript in.
      if (meta && meta.clipId) this._queueTranscribe(meta.clipId);
      return null;
    }
  },

  // Clips awaiting a retry. Kept as ids only — the audio itself is already
  // in IndexedDB, so nothing is lost if the tab closes.
  _queueTranscribe(clipId) {
    try {
      const q = JSON.parse(localStorage.getItem('amy_tx_queue') || '[]');
      if (q.indexOf(clipId) === -1) { q.push(clipId); localStorage.setItem('amy_tx_queue', JSON.stringify(q)); }
    } catch (e) {}
  },

  // Retry parked clips. Safe to call on a timer or when the app regains focus.
  async retryPendingTranscripts() {
    let q = [];
    try { q = JSON.parse(localStorage.getItem('amy_tx_queue') || '[]'); } catch (e) { return 0; }
    if (!q.length) return 0;
    let done = 0;
    for (const clipId of q.slice(0, 3)) {          // a few at a time
      let clip = null;
      try { clip = await RecStore.get(RecStore.CLIPS, clipId); } catch (e) {}
      if (!clip || !clip.blob) { q = q.filter(x => x !== clipId); continue; }
      const out = await this.transcribe(clip.blob, null);
      if (out && out.text) {
        const rec = (await this.getSpeakingRecords({})).find(r => r.clipId === clipId);
        if (rec) { rec.spoken = out.text; rec.source = 'asr'; await RecStore.put(RecStore.SCORES, rec); }
        q = q.filter(x => x !== clipId);
        done++;
      }
    }
    try { localStorage.setItem('amy_tx_queue', JSON.stringify(q)); } catch (e) {}
    return done;
  },

  // -- cloud sync ---------------------------------------------------------
  async syncUp(students, classes) {
    const res = await CloudSync.up(students, classes);
    const d = Store.doc();
    d.students = res.students;
    d.classes = res.classes;
    Store.flush();
    return res;
  },

  async syncDown(students, classes) {
    const res = await CloudSync.down(students, classes);
    if (res.ok) Store.flush();
    return res;
  },

  syncError() { return CloudSync.lastError(); },
  cloudAvailable() { return CloudSync.available(); },
};
