/* eslint-disable */
// TEACHER_PHONE now lives in api.js — role resolution is Api's job, so that
// it can move to the Worker without touching this file.
const App = {
  state: {
    // Empty until Api resolves a session. Was 'teacher', which only worked
    // because isTeacher() used to compare the phone number instead.
    role: '',
    userName: '',
    phone: '',
    className: '',
    currentDay: 0,
    currentTab: 'weekly',
    currentModule: null,
    vocabStage: 0,
    vocabWordIdx: 0,
    vocabScore: 0,
    selectedVoice: 'female',
    answers: {},
    checkins: {},
    errorBook: [],
    students: [],
    parentStudents: {},
    classes: [],
    audioEnabled: false,
    voices: [],
    learnedWords: {},
    speakingRecords: [],
    stepIdx: 0,
  },

  async init() {
    await this.loadData();
    this.loadVoices();
    if (typeof Cloud !== 'undefined') Cloud.init();
    // WeChat built-in browser: unlock audio as soon as WeixinJSBridge is
    // ready. On WeChat, the first play() must happen inside this callback
    // or a user gesture — this covers the "opened app but never tapped"
    // case on WeChat.
    this._setupWeChatAudioUnlock();
    // Attach the one-time unlock on EVERY path, not just auto-login. Browsers
    // only allow playback after a user gesture; with the 「开启语音」 screen
    // gone, the first tap anywhere has to be what unlocks it — otherwise the
    // sentence auto-read is called but never actually heard.
    this._setupAudioUnlock();
    // Show WeChat notice if in WeChat
    if (this.isWeChat()) {
      const notice = document.getElementById('wechat-notice');
      if (notice) notice.style.display = 'flex';
    }
    if (/[?&]ttstest=1/.test(location.search)) { this.runTtsTest(); return; }
    // Auto-login if saved credentials exist
    this.tryAutoLogin();
  },

  // Unlock the audio element when WeixinJSBridge becomes available
  _setupWeChatAudioUnlock() {
    var self = this;
    if (typeof WeixinJSBridge === 'undefined') {
      document.addEventListener('WeixinJSBridgeReady', function() {
        self._unlockAudioElement();
      }, false);
    } else {
      self._unlockAudioElement();
    }
  },

  // Play the inline silent WAV once to unlock the persistent audio element
  _unlockAudioElement() {
    try {
      var el = document.getElementById('tts-player');
      if (el && !this._ttsUnlocked) {
        el.src = this.SILENT_WAV;
        el.volume = 0;
        var p = el.play();
        if (p && p.then) { p.then(function() { el.volume = 1; }).catch(function() { el.volume = 1; }); }
      }
    } catch(e) {}
  },

  // Auto-login from saved credentials
  async tryAutoLogin() {
    try {
      const creds = await Api.getSavedLogin();
      if (creds) {
        {
          // Fill in the form fields (in case auto-login needs to show them)
          const phoneInput = document.getElementById('login-phone');
          const nameInput = document.getElementById('login-name');
          if (phoneInput) phoneInput.value = creds.phone;
          if (nameInput) nameInput.value = creds.name;
          // Auto-login
          this.state.phone = creds.phone;
          this.state.userName = creds.name;
          // Keep audioEnabled=false until user interacts (browser requires
          // a user gesture to unlock audio). The render functions will show
          // a "开启语音" banner; when the user taps it or taps anywhere on
          // screen, _setupAudioUnlock fires, sets audioEnabled=true, and
          // re-renders so auto-speak works.
          this.state.audioEnabled = false;
          this._ttsUnlocked = false;
          this.loadVoices();
          // Add one-time listener to unlock audio on first interaction
          this._setupAudioUnlock();
          const session = await Api.resolveSession(creds.phone, creds.name);
          if (session.role === 'teacher') {
            this.state.role = 'teacher';
            this.state.className = '';
            this.showApp();
          } else {
            this.state.role = 'user';
            this.registerStudent(creds.phone, creds.name);
          }
        }
      }
    } catch(e) { console.warn('Auto login error:', e); }
  },

  // Setup one-time audio unlock on first user interaction (for auto-login case)
  _setupAudioUnlock() {
    if (this._ttsUnlocked) return;
    var self = this;
    var unlockHandler = function() {
      if (self._ttsUnlocked) return;
      self._ttsUnlocked = true;
      self.state.audioEnabled = true;
      // Unlock Web Audio API context (for sound effects)
      var ctx = self._getAudioCtx();
      if (ctx && ctx.state === 'suspended') { ctx.resume(); }
      // Unlock the persistent audio element within user gesture
      // Only do this if nothing is currently playing (avoid interrupting ongoing TTS)
      // Uses an inline silent WAV (no network dependency) for maximum reliability.
      var audioEl = document.getElementById('tts-player');
      if (audioEl && !self._currentAudio) {
        audioEl.src = self.SILENT_WAV;
        audioEl.volume = 0;
        var p = audioEl.play();
        if (p && p.then) {
          p.then(function() { audioEl.volume = 1; }).catch(function() { audioEl.volume = 1; });
        }
      }
      // Remove listeners
      document.removeEventListener('touchstart', unlockHandler);
      document.removeEventListener('click', unlockHandler);
      // Anything queued before the unlock (the sentence the child just landed
      // on) gets played now instead of being lost.
      if (self._pendingSpeak) {
        var pending = self._pendingSpeak;
        self._pendingSpeak = null;
        self.speak(pending);
        return;
      }
      // Re-render content so auto-speak can now work with unlocked audio
      if (self.state.phone) {
        self.renderContent();
      }
    };
    document.addEventListener('touchstart', unlockHandler, { once: false, passive: true });
    document.addEventListener('click', unlockHandler, { once: false });
  },

  // ===== Data =====
  // One read at startup. Api owns the storage format and the v5/v4 migration;
  // the collections come back by reference, so App.state stays the in-memory
  // source of truth for rendering while Api persists behind it.
  async loadData() {
    const d = await Api.loadState();
    this.state.answers = d.answers;
    this.state.checkins = d.checkins;
    this.state.errorBook = d.errorBook;
    this.state.students = d.students;
    this.state.parentStudents = d.parentStudents;
    this.state.classes = d.classes;
    this.state.learnedWords = await Api.getLearnedWords();
  },

  // ===== Login =====
  isTeacher() {
    return this.state.role === 'teacher';
  },

  // The id answers and recordings are filed under. Falls back to the phone
  // number so a student whose roster row has not synced yet still records.
  _myStudentId() {
    const me = this.state.students.find(s => s.phone === this.state.phone);
    return me ? me.id : ('s' + this.state.phone);
  },

  // How many questions a day contains — the denominator for the check-in.
  // Counts exactly what the four recording entry points can answer, so a day
  // can actually reach 'full'. Vocab and spelling drills are excluded: they
  // are repeatable practice with no stable question identity.
  _countDayQuestions(dayIdx) {
    const day = HOMEWORK_DATA[dayIdx];
    if (!day || !day.modules) return 0;
    let n = 0;
    day.modules.forEach(m => {
      if (m.type === 'vocab') return;
      if (m.questions) n += m.questions.length;
      if (m.blanks) n += m.blanks.length;
    });
    return n;
  },

  // Single funnel for every answered question. Fire-and-forget: the DOM
  // feedback the caller renders is what the child sees, not this.
  _recordAnswer(dayIdx, moduleIdx, qIdx, value, correct) {
    if (this.isTeacher() || !this.state.phone) return;
    const sid = this._myStudentId();
    Api.saveAnswer(sid, dayIdx, moduleIdx, qIdx, value, correct)
      .then(res => res.recorded
        ? Api.saveCheckin(sid, dayIdx, this._countDayQuestions(dayIdx))
        : null)
      .catch(e => console.warn('Record answer failed:', e));
    // Speaking questions must NOT auto-advance: picking the right option is
    // only the gate into the read-along, which is the actual exercise. That
    // flow advances itself when the child finishes reading.
    const mod = (HOMEWORK_DATA[dayIdx] || {}).modules || [];
    if (mod[moduleIdx] && mod[moduleIdx].type === 'speaking') {
      clearTimeout(this._advanceTimer);
      return;
    }
    // Answered right → move on by itself. Answered wrong → stay put, so the
    // child can read the explanation and move on when they are ready.
    if (correct) this._scheduleAdvance(1300);
    else clearTimeout(this._advanceTimer);
  },

  isWeChat() {
    return /MicroMessenger/i.test(navigator.userAgent);
  },

  // Real-time name format validation
  checkNameFormat() {
    var input = document.getElementById('login-name');
    var hint = document.getElementById('name-hint');
    var errEl = document.getElementById('name-error');
    if (!input || !hint) return;
    var val = input.value.trim();
    var nameRegex = /^[\u4e00-\u9fa5]{2,4}-[A-Za-z]{2,20}$/;
    if (val === '') {
      hint.style.color = 'var(--text-sub)';
      hint.textContent = '格式：中文名(2-4字) + 减号 + 英文名(2-20字母)，如：马慧-Amy';
      if (errEl) errEl.style.display = 'none';
    } else if (nameRegex.test(val)) {
      hint.style.color = 'var(--success)';
      hint.textContent = '✅ 格式正确';
      if (errEl) errEl.style.display = 'none';
    } else {
      hint.style.color = 'var(--danger)';
      if (val.indexOf('-') === -1) {
        hint.textContent = '⚠️ 缺少减号"-"，正确格式：中文名-英文名（如：马慧-Amy）';
      } else {
        var parts = val.split('-');
        if (parts[0] && !/^[\u4e00-\u9fa5]{2,4}$/.test(parts[0])) {
          hint.textContent = '⚠️ 中文名需要2-4个汉字';
        } else if (parts[1] && !/^[A-Za-z]{2,20}$/.test(parts[1])) {
          hint.textContent = '⚠️ 英文名需要2-20个英文字母';
        } else {
          hint.textContent = '⚠️ 格式不正确，正确格式：中文名-英文名（如：马慧-Amy）';
        }
      }
    }
  },

  async login() {
    const phone = document.getElementById('login-phone').value.trim();
    const name = document.getElementById('login-name').value.trim();
    if (!phone || phone.length < 11) { alert('请输入正确的11位手机号'); return; }
    if (!name) { alert('请输入备注名'); return; }

    // Validate name format: must be 中文名-英文名
    const nameRegex = /^[\u4e00-\u9fa5]{2,4}-[A-Za-z]{2,20}$/;
    if (!nameRegex.test(name)) {
      var errEl = document.getElementById('name-error');
      if (errEl) {
        errEl.style.display = 'block';
        errEl.scrollIntoView({behavior:'smooth', block:'center'});
      }
      alert('备注名格式不正确！必须按"中文名-英文名"格式填写，例如：马慧-Amy\n（中文名2-4个汉字，英文名2-20个字母）');
      return;
    }

    this.state.phone = phone;
    this.state.userName = name;

    // Enable audio on user interaction (login click is a valid user gesture)
    this.state.audioEnabled = true;
    this._ttsUnlocked = true;
    // Unlock Web Audio API context (for sound effects)
    var ctx = this._getAudioCtx();
    if (ctx && ctx.state === 'suspended') { ctx.resume(); }

    // CRITICAL: Unlock the persistent audio element NOW (within user gesture).
    // This must happen BEFORE any async calls (registerStudent uses await)
    // because the browser only allows audioEl.play() inside a user gesture.
    // Once unlocked here, subsequent play() calls will work even after async.
    // Uses an inline silent WAV (no network dependency) for maximum reliability.
    var unlockAudioEl = document.getElementById('tts-player');
    if (unlockAudioEl) {
      unlockAudioEl.src = this.SILENT_WAV;
      unlockAudioEl.volume = 0;
      var unlockPromise = unlockAudioEl.play();
      if (unlockPromise && unlockPromise.then) {
        unlockPromise.then(function() { unlockAudioEl.volume = 1; })
                     .catch(function() { unlockAudioEl.volume = 1; });
      }
    }

    this.loadVoices();

    // Everything above ran synchronously inside the click so the audio
    // element is unlocked. Only now is it safe to await.
    const session = await Api.login(phone, name);
    if (session.role === 'teacher') {
      this.state.role = 'teacher';
      this.state.className = '';
      this.showApp();
    } else {
      this.state.role = 'user';
      // Register student and check approval
      this.registerStudent(phone, name);
    }
  },

  // Register student - goes straight in, no approval needed
  async registerStudent(phone, name) {
    // Save locally
    this.state.parentStudents[phone] = { name: name, class: '', approved: false };
    await Api.saveParentStudent(phone, this.state.parentStudents[phone]);

    let existing = this.state.students.find(s => s.phone === phone);
    if (!existing) {
      existing = {
        id: 's' + Date.now(),
        name: name,
        phone: phone,
        parentPhone: phone,
        class: '',
        approved: false,
        registeredAt: new Date().toISOString()
      };
      this.state.students.push(existing);
    } else {
      // Update existing record
      existing.name = name;
      existing.registeredAt = existing.registeredAt || new Date().toISOString();
    }
    await Api.saveStudent(existing);

    // Upload to cloud (non-blocking)
    this.syncToCloud();

    // Check cloud for class assignment (teacher may have pre-assigned)
    const mine = await Api.fetchMyAssignment(phone);
    if (mine) {
      this.state.className = mine.className;
      // Update local record
      this.state.students = this.state.students.map(s =>
        s.phone === phone ? { ...s, approved: true, class: mine.className } : s
      );
      await Api.saveStudents(this.state.students);
    }

    // Go straight into the app - no waiting page!
    this.showApp();
  },

  showWaitingPage() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('main-app').classList.add('hidden');
    const wp = document.getElementById('waiting-page');
    if (wp) wp.classList.remove('hidden');
  },

  async logout() {
    clearTimeout(this._advanceTimer);
    this.state.stepIdx = 0;
    // Clear saved login so auto-login doesn't re-login
    await Api.logout();
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    const wp = document.getElementById('waiting-page');
    if (wp) wp.classList.add('hidden');
    document.getElementById('login-phone').value = '';
    document.getElementById('login-name').value = '';
    this.state.currentTab = 'weekly';
    this.state.audioEnabled = false;
    this.state.phone = '';
    this.state.userName = '';
    // Must clear too: isTeacher() reads role now, so a stale 'teacher' here
    // would survive logout (it used to be derived from phone, cleared above).
    this.state.role = '';
    this.state.className = '';
  },

  showApp() {
    document.getElementById('login-page').classList.add('hidden');
    const wp = document.getElementById('waiting-page');
    if (wp) wp.classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    // Default to the real today (teacher can still switch days for preview)
    this.state.currentTab = this.isTeacher() ? 'weekly' : 'today';
    this.state.currentDay = this.getTodayWeekdayIdx();
    this.state.stepIdx = 0;          // always start the day at question 1
    clearTimeout(this._advanceTimer);
    // Update header name - show student name or teacher label
    const headerName = document.getElementById('header-name');
    if (headerName) {
      if (this.isTeacher()) {
        headerName.textContent = 'Amy老师';
      } else {
        headerName.textContent = this.state.userName || '同学';
      }
    }
    // Avatar follows the role: Amy's photo for the teacher, the students
    // photo for a child.
    const headerPhoto = document.getElementById('header-photo');
    if (headerPhoto) {
      headerPhoto.src = (this.isTeacher() ? 'photo.jpeg' : 'students.jpeg') + '?v=51';
      headerPhoto.alt = this.isTeacher() ? 'Amy老师' : '同学';
    }
    // Update class badge in header
    const badge = document.getElementById('class-badge');
    if (this.isTeacher()) {
      badge.textContent = this.state.classes.length > 0 ? this.state.classes.join(' / ') : '未设置班级';
    } else {
      badge.textContent = this.state.className || '待分配';
    }
    // Show/hide header buttons
    document.getElementById('invite-btn-header').style.display = this.isTeacher() ? '' : 'none';
    document.getElementById('settings-btn-header').style.display = this.isTeacher() ? '' : 'none';
    this.renderTabs();
    this.renderContent();
    // Cloud sync + auto-polling for BOTH roles:
    // - Teacher: download student registrations, merge & upload
    // - Student: download own class assignment (updates badge promptly
    //   whenever the teacher assigns a class)
    if (this.isTeacher()) {
      this.syncFromCloud().then(() => {
        // After downloading, also upload local data (merge)
        this.syncToCloud();
      });
    } else {
      this.syncFromCloud();
    }
    this.startAutoSync();
  },

  // ===== TTS / Voice =====
  // TTS callback system - lets question rendering know when audio finishes
  _ttsCallback: null,
  _currentAudio: null,
  _ttsUnlocked: false,  // Track if audio has been unlocked by user gesture
  _speakToken: 0,       // Incremented on each speak() call to invalidate stale callbacks

  // Inline silent WAV (~0.1s) — used to unlock the audio element inside a
  // user gesture WITHOUT any network request. Works offline, instant, and
  // can't be blocked by third-party TTS endpoints.
  SILENT_WAV: 'data:audio/wav;base64,UklGRmQGAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YUAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',

  // ===== Date helpers (homework dates) =====
  // Monday=0 .. Sunday=6
  getTodayWeekdayIdx() {
    return (new Date().getDay() + 6) % 7;
  },
  // Returns array of 7 Date objects (Mon..Sun) for the given week offset
  // (0 = this week, 1 = next week)
  getWeekDates(weekOffset) {
    var now = new Date();
    var monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    monday.setDate(monday.getDate() - ((now.getDay() + 6) % 7) + (weekOffset || 0) * 7);
    var dates = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  },
  formatDateCn(d) {
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  },
  // Format a full date label for a homework day, e.g. "周一 · 8月24日"
  getDayDateLabel(dayIdx, weekOffset) {
    if (dayIdx < 0 || dayIdx > 6) return '';
    var d = this.getWeekDates(weekOffset || 0)[dayIdx];
    return this.formatDateCn(d);
  },
  // Is the given day index (of given week) actually today?
  isDayToday(dayIdx, weekOffset) {
    if (weekOffset) return false;
    return dayIdx === this.getTodayWeekdayIdx();
  },

  loadVoices() {
    if (!window.speechSynthesis) return;
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        this.state.voices = voices;
      }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    setTimeout(load, 500);
    setTimeout(load, 1500);
    setTimeout(load, 3000);
  },

  // Unlock audio on mobile (must be called from user gesture)
  enableAudio() {
    this.state.audioEnabled = true;
    this._ttsUnlocked = true;
    // Unlock Web Audio API context (for sound effects)
    var ctx = this._getAudioCtx();
    if (ctx && ctx.state === 'suspended') { ctx.resume(); }
    // Unlock the persistent audio element within user gesture
    // Uses an inline silent WAV (no network dependency) for maximum reliability.
    var unlockEl = document.getElementById('tts-player');
    if (unlockEl) {
      unlockEl.src = this.SILENT_WAV;
      unlockEl.volume = 0;
      var p = unlockEl.play();
      if (p && p.then) {
        p.then(function() { unlockEl.volume = 1; }).catch(function() { unlockEl.volume = 1; });
      }
    }
    // Directly speak a test phrase - this call is within the user gesture context,
    // so audioEl.play() will unlock the persistent audio element on mobile
    this.speak('Hello! Welcome to Amy English class.', { onDone: () => { this.renderContent(); } });
  },

  // Main speak function - robust TTS with multiple fallbacks
  // Primary: Youdao TTS (works for both words and sentences, most reliable)
  // Fallback: Baidu TTS (secondary, for when Youdao fails)
  // Last resort: speechSynthesis (built-in, no network needed)
  speak(text, opts) {
    if (!text) { if (opts && opts.onDone) opts.onDone(); return; }
    opts = opts || {};

    // Stop any currently playing audio FIRST
    this._stopCurrentAudio();

    // Increment speak token — all async callbacks check this to detect
    // if they belong to a stale (superseded) speak() call
    this._speakToken = (this._speakToken || 0) + 1;
    var myToken = this._speakToken;

    this._showSpeakingIndicator(true);
    this._ttsCallback = opts.onDone || null;

    var self = this;
    var cleanText = text.substring(0, 500).trim();
    var encoded = encodeURIComponent(cleanText);

    var audioEl = document.getElementById('tts-player');
    if (!audioEl) { audioEl = new Audio(); }

    self._currentAudio = audioEl;
    self._ttsDone = false;
    self._audioStarted = false;

    // Pick the endpoint by what is being spoken. Youdao's dictvoice is a
    // DICTIONARY endpoint: it returns audio for a word and HTTP 500 for a
    // sentence (measured). That is why words played and sentences were silent
    // — desktop happened to recover through speechSynthesis, mobile browsers
    // did not. Sentences therefore go to Baidu first, with our own same-origin
    // endpoint behind it.
    var isSentence = /\s/.test(cleanText.trim());
    var youdao = 'https://dict.youdao.com/dictvoice?audio=' + encoded + '&type=2';
    var baidu  = 'https://fanyi.baidu.com/gettts?lan=en&text=' + encoded + '&spd=3&source=web';
    var ownTts = '/api/tts?text=' + encoded;
    // Sentences go to our own origin FIRST. Routing them to Baidu instead of
    // Youdao fixed nothing on the phones — words still played and sentences
    // still did not, on both iOS Safari and Xiaomi's browser. Both remaining
    // suspects (a blocked third-party host, a cross-origin media restriction)
    // disappear when the audio comes from the same origin as the page.
    // Words keep Youdao: that path is the one already known to work.
    var ttsUrl      = isSentence ? ownTts : youdao;
    var fallbackUrl = isSentence ? baidu  : baidu;

    var timeoutId = null;
    var absoluteTimeout = null;
    var synthFallbackCalled = false;
    var baiduTried = false;

    function finishTTS() {
      if (self._ttsDone || myToken !== self._speakToken) return;
      self._ttsDone = true;
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      if (absoluteTimeout) { clearTimeout(absoluteTimeout); absoluteTimeout = null; }
      self._showSpeakingIndicator(false);
      self._currentAudio = null;
      if (self._ttsCallback) { self._ttsCallback(); self._ttsCallback = null; }
    }

    function trySynthFallback() {
      if (self._ttsDone || myToken !== self._speakToken || synthFallbackCalled) return;
      synthFallbackCalled = true;
      try {
        audioEl.onplaying = null;
        audioEl.onended = null;
        audioEl.onerror = null;
        audioEl.pause();
      } catch(e) {}
      if (!self._audioStarted) {
        self._speakWithSynthesis(cleanText, opts, myToken);
      } else {
        finishTTS();
      }
    }

    audioEl.onplaying = function() {
      if (myToken !== self._speakToken) return;
      self._audioStarted = true;
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    };

    audioEl.onended = function() {
      finishTTS();
    };

    audioEl.onerror = function() {
      if (self._ttsDone || myToken !== self._speakToken) return;
      if (!self._audioStarted) {
        // Try Baidu as secondary fallback before speechSynthesis
        if (!baiduTried) {
          baiduTried = true;
          try {
            audioEl.src = fallbackUrl;
            audioEl.load();
            audioEl.play().catch(function() { trySynthFallback(); });
          } catch(e) { trySynthFallback(); }
        } else {
          trySynthFallback();
        }
      }
    };

    // If stalled (loading hangs), try Baidu then speechSynthesis
    audioEl.onstalled = function() {
      if (self._ttsDone || myToken !== self._speakToken || self._audioStarted) return;
      if (!baiduTried) {
        baiduTried = true;
        try {
          audioEl.src = fallbackUrl;
          audioEl.load();
          audioEl.play().catch(function() { trySynthFallback(); });
        } catch(e) { trySynthFallback(); }
      } else {
        trySynthFallback();
      }
    };

    audioEl.src = ttsUrl;
    audioEl.load(); // Critical for Safari/cross-browser: must call load() after setting src

    var playPromise = audioEl.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.then(function() {
        if (myToken !== self._speakToken) return;
        self._audioStarted = true;
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      }).catch(function(err) {
        if (self._ttsDone || myToken !== self._speakToken) return;
        // play() was rejected — likely autoplay restriction or network error
        // Try Baidu first, then speechSynthesis
        if (!baiduTried) {
          baiduTried = true;
          try {
            audioEl.src = fallbackUrl;
            audioEl.load();
            audioEl.play().then(function() {
              if (myToken !== self._speakToken) return;
              self._audioStarted = true;
              if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
            }).catch(function() { trySynthFallback(); });
          } catch(e) { trySynthFallback(); }
        } else {
          trySynthFallback();
        }
      });
    }

    // Safety timeout: if audio hasn't started in 2.5 seconds, try Baidu/synthesis
    timeoutId = setTimeout(function() {
      if (!self._ttsDone && !self._audioStarted && myToken === self._speakToken) {
        if (!baiduTried) {
          baiduTried = true;
          try {
            audioEl.src = fallbackUrl;
            audioEl.load();
            audioEl.play().then(function() {
              if (myToken !== self._speakToken) return;
              self._audioStarted = true;
            }).catch(function() { trySynthFallback(); });
          } catch(e) { trySynthFallback(); }
        } else {
          trySynthFallback();
        }
      }
    }, 2500);

    // Absolute timeout: no matter what, stop indicator after 12 seconds.
    // If NOTHING ever started playing (all TTS sources failed), tell the
    // user instead of failing silently.
    absoluteTimeout = setTimeout(function() {
      if (!self._ttsDone && myToken === self._speakToken) {
        if (!self._audioStarted) {
          self.showToast('🔇 语音播放失败，可点击🔊按钮重试', 'warn');
        }
        finishTTS();
      }
    }, 12000);
  },

  _stopCurrentAudio() {
    // Increment speak token to invalidate ALL pending async callbacks
    // (audio element events AND speechSynthesis events) from previous calls
    this._speakToken = (this._speakToken || 0) + 1;
    this._ttsDone = true;
    this._audioStarted = false;
    
    if (this._currentAudio) {
      try { 
        this._currentAudio.onplaying = null;
        this._currentAudio.onended = null;
        this._currentAudio.onerror = null;
        this._currentAudio.onstalled = null;
        this._currentAudio.pause(); 
      } catch(e) {}
      this._currentAudio = null;
    }
    // Cancel any speechSynthesis that might be running
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch(e) {}
    }
  },

  // speechSynthesis fallback (built into browser, no network needed)
  // token parameter ensures we only fire callbacks for the CURRENT speak() call
  _speakWithSynthesis(text, opts, token) {
    var self = this;
    var myToken = token || self._speakToken;
    if (!window.speechSynthesis) {
      this._showSpeakingIndicator(false);
      if (myToken === self._speakToken && self._ttsCallback) { self._ttsCallback(); self._ttsCallback = null; }
      return;
    }

    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = opts.rate || 0.85;
      u.pitch = 1.0;
      u.volume = 1.0;

      // Load voices if needed
      if (this.state.voices.length === 0) {
        this.state.voices = window.speechSynthesis.getVoices() || [];
      }

      // Pick best available natural voice (auto-assign)
      var voices = this.state.voices;
      var voicePrefs = [
        'Microsoft Aria Online', 'Microsoft Jenny Online', 'Microsoft Aria', 'Microsoft Jenny',
        'Google US English', 'Samantha', 'Microsoft Zira',
        'Microsoft Guy Online', 'Microsoft Davis Online', 'Microsoft Guy', 'Microsoft Davis',
        'Karen', 'Moira', 'Tessa', 'Daniel', 'Alex'
      ];
      var chosen = null;
      for (var i = 0; i < voicePrefs.length; i++) {
        chosen = voices.find(function(v) { return v.name && v.name.indexOf(voicePrefs[i]) >= 0; });
        if (chosen) break;
      }
      if (!chosen) chosen = voices.find(function(v) { return v.lang && v.lang.indexOf('en') === 0; });
      if (chosen) u.voice = chosen;

      u.onend = function() {
        // Only fire if this is still the current speak call
        if (myToken !== self._speakToken) return;
        self._showSpeakingIndicator(false);
        if (self._ttsCallback) { self._ttsCallback(); self._ttsCallback = null; }
      };
      u.onerror = function() {
        // Only fire if this is still the current speak call
        if (myToken !== self._speakToken) return;
        self._showSpeakingIndicator(false);
        if (self._ttsCallback) { self._ttsCallback(); self._ttsCallback = null; }
      };

      // Timeout: if speech doesn't start in 3 seconds, call callback
      var started = false;
      u.onstart = function() {
        if (myToken !== self._speakToken) return;
        started = true;
        self._audioStarted = true; // synthesis is producing sound — don't fire the "failed" toast
      };
      setTimeout(function() {
        if (myToken !== self._speakToken) return;
        if (!started) {
          self._showSpeakingIndicator(false);
          if (self._ttsCallback) { self._ttsCallback(); self._ttsCallback = null; }
        }
      }, 3000);

      window.speechSynthesis.speak(u);
    } catch(e) {
      this._showSpeakingIndicator(false);
      if (myToken === self._speakToken && self._ttsCallback) { self._ttsCallback(); self._ttsCallback = null; }
    }
  },

  // Show/hide speaking indicator
  _showSpeakingIndicator(show) {
    var indicators = document.querySelectorAll('.auto-read-badge');
    indicators.forEach(function(el) {
      if (show) {
        el.classList.add('speaking');
        el.innerHTML = '<svg class="icon icon-sm speaking-anim"><use href="#i-sound"/></svg> \u6b63\u5728\u6717\u8bfb\u2026';
      } else {
        el.classList.remove('speaking');
        el.innerHTML = '<svg class="icon icon-sm"><use href="#i-check"/></svg> \u6717\u8bfb\u5b8c\u6210';
      }
    });
  },

  // ===== Global toast notification (non-blocking) =====
  _toastTimer: null,
  showToast(msg, type) {
    var t = document.getElementById('app-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'app-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = 'app-toast show' + (type ? ' ' + type : '');
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(function() {
      t.classList.remove('show');
    }, 3000);
  },

  // Auto-speak with callback - minimal delay for fast response
  autoSpeak(text, callback) {
    if (this.state.audioEnabled && text) {
      this.speak(text, { onDone: callback });
    } else if (callback) {
      callback();
    }
  },

  // ===== Sound Effects (Web Audio API - no external files needed) =====
  _audioCtx: null,
  _getAudioCtx() {
    if (!this._audioCtx) {
      try {
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch(e) { return null; }
    }
    return this._audioCtx;
  },

  // Play a pleasant "ding" sound for correct answers
  _playCorrectSound() {
    var ctx = this._getAudioCtx();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();
      // Two ascending notes (C5 -> E5 -> G5) - a happy chord arpeggio
      var notes = [523.25, 659.25, 783.99];
      notes.forEach(function(freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        var startTime = ctx.currentTime + i * 0.08;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } catch(e) {}
  },

  // Play a gentle "buzz" sound for wrong answers
  _playWrongSound() {
    var ctx = this._getAudioCtx();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 200;
      osc.type = 'square';
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch(e) {}
  },

  // Show celebration animation
  _showCelebration(el) {
    if (!el) return;
    var emojis = ['\ud83c\udf89', '\u2b50', '\ud83d\udcab', '\ud83c\udf8a', '\u2728', '\ud83d\ude0d'];
    var emoji = emojis[Math.floor(Math.random() * emojis.length)];
    var div = document.createElement('div');
    div.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:60px;pointer-events:none;z-index:100;animation:celebrate 1s ease-out forwards';
    div.textContent = emoji;
    el.style.position = 'relative';
    el.appendChild(div);
    setTimeout(function() { if (div.parentNode) div.parentNode.removeChild(div); }, 1000);
  },

  // ===== Cloud Sync =====
  // The merge itself lives in Api (see CloudSync in api.js) — it is an
  // artefact of blob storage, not business logic. This function keeps only
  // the parts that are: updating state and telling the user what happened.
  async syncToCloud() {
    if (!Api.cloudAvailable()) return;
    try {
      const res = await Api.syncUp(this.state.students, this.state.classes);
      this._reportSyncResult(res.ok);
      this.state.students = res.students;
      this.state.classes = res.classes;
    } catch(e) {
      console.warn('Sync to cloud error:', e);
      this._reportSyncResult(false);
    }
  },

  // Report sync result to the user via toast (throttled: failures shown
  // at most once every 5 minutes so auto-polling doesn't spam)
  _reportSyncResult(ok) {
    var now = Date.now();
    if (ok) {
      this._lastSyncOk = true;
      this._lastSyncAt = now;
      return;
    }
    var wasOk = this._lastSyncOk !== false;
    this._lastSyncOk = false;
    if (wasOk || !this._lastFailToastAt || (now - this._lastFailToastAt) > 300000) {
      this._lastFailToastAt = now;
      this.showToast('⚠️ 云同步失败，数据已保存在本机', 'warn');
    }
  },

  // Human-readable sync status for teacher pages
  _syncStatusText() {
    if (this._lastSyncOk === false) return '⚠️ 同步失败（网络问题），点击"立即同步"重试';
    if (this._lastSyncAt) {
      var d = new Date(this._lastSyncAt);
      var hm = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
      return '已连接 · 上次同步 ' + hm;
    }
    return '已开启';
  },

  // Manual full sync (push local changes, then pull remote changes)
  async manualSync() {
    this.showToast('🔄 正在同步...', 'info');
    await this.syncToCloud();
    await this.syncFromCloud();
    if (this._lastSyncOk !== false) {
      this.showToast('✅ 同步成功，已是最新数据');
    }
    this.renderContent();
  },

  // Sync all data FROM cloud (teacher loads student registrations)
  // Merge logic lives in Api; this keeps the UI reactions.
  async syncFromCloud() {
    if (!Api.cloudAvailable()) return;
    try {
      const res = await Api.syncDown(this.state.students, this.state.classes);
      if (!res.ok) {
        if (res.unreachable) this._reportSyncResult(false);
        return;
      }
      this._lastSyncOk = true;

      // Student side: keep own class assignment up to date.
      // When the teacher assigns a class, students pick it up here
      // (polled every 15s + on every app foreground).
      if (!this.isTeacher() && this.state.phone) {
        const me = this.state.students.find(s => s.phone === this.state.phone);
        const cloudClass = me ? (me.class || '') : '';
        if (cloudClass && cloudClass !== this.state.className) {
          this.state.className = cloudClass;
          // Update the class badge in the header right away
          const badge = document.getElementById('class-badge');
          if (badge) badge.textContent = cloudClass;
          // Re-render so any class-dependent view refreshes
          this.renderContent();
          console.log('Class updated from cloud:', cloudClass);
        } else if (!cloudClass && this.state.className) {
          // Class was removed on teacher side — clear it
          this.state.className = '';
          const badge = document.getElementById('class-badge');
          if (badge) badge.textContent = '待分配';
        }
      }

      // Teacher: re-render if on a relevant tab
      if (this.isTeacher() && (this.state.currentTab === 'students' || this.state.currentTab === 'classmgmt' || this.state.currentTab === 'checkin')) {
        this.renderContent();
      }
    } catch(e) { console.warn('Sync from cloud error:', e); }
  },

  // Auto-polling - keeps data fresh on BOTH teacher and student devices.
  // Teacher: picks up new student registrations (every 30s).
  // Student: picks up class assignments made by the teacher (every 15s)
  //          so the class badge updates promptly after the teacher
  //          assigns a class.
  startAutoSync() {
    if (this._syncInterval) clearInterval(this._syncInterval);
    var interval = this.isTeacher() ? 30000 : 15000;
    this._syncInterval = setInterval(() => {
      this.syncFromCloud();
    }, interval);

    // Also sync whenever the app comes back to the foreground
    // (covers WeChat/browser tab switching, phone unlock)
    if (!this._visibilityHandler) {
      var self = this;
      this._visibilityHandler = function() {
        if (document.visibilityState === 'visible' && self.state.phone) {
          self.syncFromCloud();
          // Clips whose transcription failed on a bad connection get another
          // go here — the audio is already safe in IndexedDB.
          Api.retryPendingTranscripts().catch(function(){});
        }
      };
      document.addEventListener('visibilitychange', this._visibilityHandler);
    }
  },

  // ===== Settings =====
  showSettings() {
    this.showModal(
      '<div class="modal-header"><div class="modal-title">\u2699\ufe0f \u7cfb\u7edf\u8bbe\u7f6e</div><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
      '<div class="modal-body">' +
        '<div class="settings-card">' +
          '<div class="sc-title">\u2601\ufe0f \u4e91\u7aef\u540c\u6b65</div>' +
          '<div class="sc-desc">\u5b66\u751f\u6ce8\u518c\u4fe1\u606f\u81ea\u52a8\u540c\u6b65\u5230\u4e91\u7aef\uff0c\u65e0\u9700\u624b\u52a8\u914d\u7f6e\u3002\u8001\u5e08\u767b\u5f55\u540e\u81ea\u52a8\u63a5\u6536\u5b66\u751f\u6ce8\u518c\u4fe1\u606f\u3002</div>' +
          '<div class="cloud-status on">\u2705 \u4e91\u7aef\u540c\u6b65\u5df2\u5f00\u542f\uff08\u81ea\u52a8\uff09</div>' +
          '<button class="btn btn-outline btn-sm mt-8" onclick="App.manualSync();App.closeModal()">\ud83d\udd04 \u7acb\u5373\u540c\u6b65</button>' +
        '</div>' +
        '<div class="settings-card">' +
          '<div class="sc-title">\ud83c\udfa4 \u8bed\u97f3\u8bbe\u7f6e</div>' +
          '<div class="sc-desc">\u5982\u679c\u5fae\u4fe1\u5185\u65e0\u6cd5\u64ad\u653e\u8bed\u97f3\uff0c\u8bf7\u70b9\u53f3\u4e0a\u89d2 \u00b7\u00b7\u00b7 \u9009\u62e9\u201c\u5728\u6d4f\u89c8\u5668\u4e2d\u6253\u5f00\u201d</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn btn-outline btn-sm" onclick="App.testTTS(1)">\ud83d\udd0a \u8bd5\u542c\u6709\u9053TTS</button>' +
          '<button class="btn btn-outline btn-sm" onclick="App.testTTS(2)">\ud83d\udd0a \u8bd5\u542c\u767e\u5ea6TTS</button>' +
          '<button class="btn btn-outline btn-sm" onclick="App.testTTS(3)">\ud83d\udd0a \u8bd5\u542c\u6d4f\u89c8\u5668TTS</button>' +
          '</div>' +
          '<div id="tts-test-result" style="margin-top:8px;font-size:12px"></div>' +
        '</div>' +
        '<div class="settings-card">' +
          '<div class="sc-title">\ud83d\udcca \u6570\u636e\u7ba1\u7406</div>' +
          '<div class="sc-desc">\u672c\u5730\u6570\u636e\u4f1a\u81ea\u52a8\u5907\u4efd\u5230\u4e91\u7aef\u3002\u5982\u9700\u91cd\u7f6e\u672c\u5730\u6570\u636e\uff0c\u53ef\u4ee5\u624b\u52a8\u5bfc\u5165\u4e91\u7aef\u6570\u636e\u3002</div>' +
          '<button class="btn btn-outline btn-sm mt-8" onclick="App.syncFromCloud();alert(\'\u2705 \u5df2\u4ece\u4e91\u7aef\u540c\u6b65\u6700\u65b0\u6570\u636e\')">\ud83d\udcbe \u4ece\u4e91\u7aef\u6062\u590d\u6570\u636e</button>' +
        '</div>' +
      '</div>'
    );
  },

  saveSettings() {
    this.closeModal();
  },

  // Test TTS with specific source
  testTTS(source) {
    var self = this;
    var resultEl = document.getElementById('tts-test-result');
    var testText = 'Hello! Welcome to Amy English class.';
    var encoded = encodeURIComponent(testText);

    if (resultEl) resultEl.innerHTML = '<span style="color:var(--info)">\u23f3 \u6b63\u5728\u6d4b\u8bd5...</span>';

    var audioEl = document.getElementById('tts-player');
    if (!audioEl) audioEl = new Audio();

    // Stop any current audio
    this._stopCurrentAudio();
    this._speakToken = (this._speakToken || 0) + 1;
    var myToken = this._speakToken;
    this._ttsDone = false;
    this._currentAudio = audioEl;

    var url;
    if (source === 1) {
      url = 'https://dict.youdao.com/dictvoice?audio=' + encoded + '&type=2';
    } else if (source === 2) {
      url = 'https://fanyi.baidu.com/gettts?lan=en&text=' + encoded + '&spd=3&source=web';
    } else {
      // Browser speechSynthesis
      if (resultEl) resultEl.innerHTML = '<span style="color:var(--info)">\u23f3 \u6b63\u5728\u4f7f\u7528\u6d4f\u89c8\u5668\u5185\u7f6e\u8bed\u97f3...</span>';
      this._ttsCallback = function() {
        if (myToken !== self._speakToken) return;
        if (resultEl) resultEl.innerHTML = '<span style="color:var(--success)">\u2705 \u6d4f\u89c8\u5668TTS\u64ad\u653e\u5b8c\u6210\uff01\u5982\u679c\u542c\u5230\u4e86\u58f0\u97f3\uff0c\u8bf4\u660e\u6d4f\u89c8\u5668TTS\u53ef\u7528</span>';
      };
      this._speakWithSynthesis(testText, {}, myToken);
      return;
    }

    audioEl.onended = function() {
      if (myToken !== self._speakToken) return;
      self._ttsDone = true;
      self._currentAudio = null;
      if (resultEl) {
        var srcName = source === 1 ? '\u6709\u9053' : '\u767e\u5ea6';
        resultEl.innerHTML = '<span style="color:var(--success)">\u2705 ' + srcName + 'TTS\u64ad\u653e\u6210\u529f\uff01\u5982\u679c\u542c\u5230\u4e86\u58f0\u97f3\uff0c\u8bf4\u660e' + srcName + 'TTS\u53ef\u7528</span>';
      }
    };
    audioEl.onerror = function() {
      if (myToken !== self._speakToken) return;
      self._ttsDone = true;
      self._currentAudio = null;
      if (resultEl) {
        var srcName = source === 1 ? '\u6709\u9053' : '\u767e\u5ea6';
        resultEl.innerHTML = '<span style="color:var(--danger)">\u274c ' + srcName + 'TTS\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u5c1d\u8bd5\u5176\u4ed6\u9009\u9879</span>';
      }
    };

    audioEl.src = url;
    audioEl.load();
    var playPromise = audioEl.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.catch(function(err) {
        if (myToken !== self._speakToken) return;
        self._ttsDone = true;
        self._currentAudio = null;
        if (resultEl) {
          var srcName = source === 1 ? '\u6709\u9053' : '\u767e\u5ea6';
          resultEl.innerHTML = '<span style="color:var(--danger)">\u274c ' + srcName + 'TTS\u64ad\u653e\u5931\u8d25\uff1a' + (err.message || err.name || '\u672a\u77e5\u9519\u8bef') + '\u3002\u53ef\u80fd\u662f\u624b\u673a\u6d4f\u89c8\u5668\u9650\u5236\uff0c\u8bf7\u5728\u6d4f\u89c8\u5668\u4e2d\u6253\u5f00\u540e\u5c1d\u8bd5</span>';
        }
      });
    }

    // Timeout
    setTimeout(function() {
      if (!self._ttsDone && myToken === self._speakToken) {
        if (resultEl) {
          var srcName = source === 1 ? '\u6709\u9053' : '\u767e\u5ea6';
          resultEl.innerHTML = '<span style="color:var(--warning)">\u23f3 ' + srcName + 'TTS\u8d85\u65f6\uff0c\u8bf7\u5c1d\u8bd5\u5176\u4ed6\u9009\u9879</span>';
        }
      }
    }, 8000);
  },

  // ===== Tabs =====
  renderTabs() {
    const bar = document.getElementById('tab-bar');
    const isTeacher = this.isTeacher();
    let tabs;
    // Icons are sprite ids from the <symbol> set in index.html — no emoji.
    if (isTeacher) {
      tabs = [
        { id: 'weekly', icon: 'i-list', name: '周计划' },
        { id: 'daily', icon: 'i-calendar', name: '每日详情' },
        { id: 'edit', icon: 'i-pencil', name: '作业编辑' },
        { id: 'checkin', icon: 'i-chart', name: '打卡监控' },
        { id: 'scores', icon: 'i-trend', name: '成绩分析' },
        { id: 'errors', icon: 'i-close', name: '错题本' },
        { id: 'print', icon: 'i-printer', name: '错题卷打印' },
        { id: 'speaking', icon: 'i-mic', name: '口语记录' },
        { id: 'students', icon: 'i-users', name: '学生管理' },
        { id: 'classmgmt', icon: 'i-layers', name: '班级管理' },
      ];
    } else {
      // Non-teacher: see today's homework, own child progress, class comparison, own error book
      tabs = [
        { id: 'today', icon: 'i-doc', name: '今日作业' },
        { id: 'myprogress', icon: 'i-chart', name: '孩子打卡' },
        { id: 'compare', icon: 'i-trophy', name: '完成率对比' },
        { id: 'myerrors', icon: 'i-close', name: '错题改错' },
      ];
    }
    bar.innerHTML = tabs.map(t => `<button class="${t.id===this.state.currentTab?'active':''}" onclick="App.switchTab('${t.id}')"><svg class="icon"><use href="#${t.icon}"/></svg>${t.name}</button>`).join('');
    this._setupTabScroll(bar);
  },

  // The tab strip scrolls horizontally when it overflows. Touch can swipe it,
  // but a mouse cannot scroll an overflow-x container — so tabs pushed off the
  // end were simply unreachable on a narrow desktop window. Three fixes:
  // map the wheel onto it, fade the right edge so it looks scrollable, and
  // always bring the active tab into view.
  _setupTabScroll(bar) {
    const sync = () => {
      const over = bar.scrollWidth > bar.clientWidth + 1;
      bar.classList.toggle('is-overflowing', over);
      bar.classList.toggle('at-end', over && bar.scrollLeft + bar.clientWidth >= bar.scrollWidth - 2);
    };

    if (!bar._scrollWired) {
      bar._scrollWired = true;
      bar.addEventListener('wheel', (e) => {
        if (bar.scrollWidth <= bar.clientWidth) return;
        // Trackpads send deltaX; mice only send deltaY. Use whichever is bigger.
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (!d) return;
        e.preventDefault();
        bar.scrollLeft += d;
      }, { passive: false });
      bar.addEventListener('scroll', sync, { passive: true });
      window.addEventListener('resize', sync);
    }

    const active = bar.querySelector('button.active');
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    sync();
  },

  async switchTab(tab) {
    // A pending auto-advance must not fire after the child has navigated away,
    // or it silently skips a question when they come back.
    clearTimeout(this._advanceTimer);
    this.state.currentTab = tab;
    this.renderTabs();
    // Speaking records live in IndexedDB, but renderers are synchronous.
    // Pull them into state first, then render from the cache.
    if (tab === 'speaking') {
      try {
        this.state.speakingRecords = await Api.getSpeakingRecords();
        // Pair each score with its clip so the teacher can actually listen.
        const clips = await Api.getRecordings({});
        const byId = {};
        clips.forEach(c => { byId[c.id] = c.url; });
        this.state.speakingRecords.forEach(r => { r.audioUrl = byId[r.clipId] || null; });
      } catch(e) { this.state.speakingRecords = []; }
    }
    this.renderContent();
  },

  renderContent() {
    const area = document.getElementById('content-area');
    const isTeacher = this.isTeacher();
    const tab = this.state.currentTab;
    // Only the homework stage locks the page; every other view scrolls.
    document.body.classList.toggle('stage-mode', !isTeacher && tab === 'today');

    if (isTeacher) {
      switch(tab) {
        case 'weekly': area.innerHTML = this.renderWeekly(); break;
        case 'daily': area.innerHTML = this.renderDaily(); break;
        case 'edit': area.innerHTML = this.renderEdit(); break;
        case 'checkin': area.innerHTML = this.renderCheckin(); break;
        case 'scores': area.innerHTML = this.renderScores(); break;
        case 'errors': area.innerHTML = this.renderErrorBook(); break;
        case 'print': area.innerHTML = this.renderPrint(); break;
        case 'speaking': area.innerHTML = this.renderSpeakingRecords(); break;
        case 'students': area.innerHTML = this.renderStudents(); break;
        case 'classmgmt': area.innerHTML = this.renderClassMgmt(); break;
      }
    } else {
      switch(tab) {
        case 'today': area.innerHTML = this.renderToday(); break;
        case 'myprogress': area.innerHTML = this.renderMyProgress(); break;
        case 'compare': area.innerHTML = this.renderCompare(); break;
        case 'myerrors': area.innerHTML = this.renderMyErrors(); break;
      }
    }
  },

  // ===== Teacher: Weekly Plan =====
  renderWeekly() {
    const thisWeek = this.getWeekDates(0);
    const nextWeek = this.getWeekDates(1);
    let html = '<h2 style="color:var(--primary-dark);margin-bottom:12px">📋 作业周计划（本周 + 下周）</h2>';
    html += '<div class="stat-row mb-16">';
    html += '<div class="stat-box"><div class="num">' + HOMEWORK_DATA.length + '</div><div class="label">每天模块</div></div>';
    let totalMod = 0;
    HOMEWORK_DATA.forEach(d => totalMod += d.modules.length);
    html += '<div class="stat-box"><div class="num">' + totalMod + '</div><div class="label">周模块数</div></div>';
    html += '<div class="stat-box"><div class="num">' + this.state.students.length + '</div><div class="label">学生数</div></div>';
    let totalDur = 0;
    HOMEWORK_DATA.forEach(d => totalDur += d.total_duration);
    html += '<div class="stat-box"><div class="num">' + totalDur + '</div><div class="label">周总时长(分)</div></div>';
    html += '</div>';

    // Render one week block (weekOffset: 0=this week, 1=next week)
    var renderWeekBlock = (weekOffset, dates) => {
      var label = weekOffset === 0
        ? '📅 本周作业（' + this.formatDateCn(dates[0]) + ' ~ ' + this.formatDateCn(dates[6]) + '）'
        : '📅 下周作业（' + this.formatDateCn(dates[0]) + ' ~ ' + this.formatDateCn(dates[6]) + '）';
      var out = '<h3 style="color:var(--primary-dark);margin:16px 0 8px">' + label + '</h3>';
      out += '<div class="day-grid">';
      HOMEWORK_DATA.forEach((day, i) => {
        const isToday = this.isDayToday(i, weekOffset);
        out += '<div class="day-card ' + (day.is_speaking_day ? 'speaking' : '') + '" style="' + (isToday ? 'border-color:var(--primary);box-shadow:0 0 0 2px var(--primary-light)' : '') + '" onclick="App.viewDay(' + i + ',' + weekOffset + ')">';
        out += '<div class="day-name">' + day.day_cn + (isToday ? ' <span style="font-size:11px;color:var(--primary)">今天</span>' : '') + '</div>';
        out += '<div class="day-type" style="font-size:11px;color:var(--primary-dark)">' + this.formatDateCn(dates[i]) + '</div>';
        out += '<div class="day-type">' + (day.is_speaking_day ? '🎤 AI口语日' : '📝 练习日') + '</div>';
        out += '<div class="day-modules">' + day.modules.map(m => m.name_cn).join('<br>') + '</div>';
        out += '<div class="day-duration">共' + day.total_duration + '分钟</div>';
        out += '</div>';
      });
      out += '</div>';
      return out;
    };

    html += renderWeekBlock(0, thisWeek);
    html += renderWeekBlock(1, nextWeek);
    // Hidden container used by viewDay for detail preview
    html += '<div id="day-detail"></div>';
    return html;
  },

  viewDay(idx, weekOffset) {
    weekOffset = weekOffset || 0;
    const day = HOMEWORK_DATA[idx];
    const detail = document.getElementById('day-detail');
    if (!detail) return;
    const dateLabel = this.getDayDateLabel(idx, weekOffset);
    const weekLabel = weekOffset === 0 ? '本周' : '下周';
    let html = '<h3 style="color:var(--primary-dark);margin:16px 0 8px">' + weekLabel + day.day_cn + '（' + dateLabel + '）作业详情</h3>';
    day.modules.forEach(m => {
      html += '<div class="module-card">';
      html += '<div class="module-header"><span class="m-name">' + this.getModuleIcon(m.type) + ' ' + m.name_cn + '</span><span class="m-duration">' + m.duration + '分钟</span></div>';
      html += '<div class="module-body">';
      if (m.type === 'speaking' && m.questions) {
        m.questions.forEach((q, qi) => {
          html += '<div class="q-item">';
          html += '<div class="q-num">第' + (qi+1) + '题</div>';
          html += '<div class="q-text">' + q.sentence + '</div>';
          html += '<div class="text-sub fs-12">' + (q.sentence_cn||'') + '</div>';
          html += '<div class="q-options">';
          q.options.forEach((o, oi) => {
            const cls = oi === q.answer ? 'correct' : '';
            html += '<div class="q-option ' + cls + '">' + String.fromCharCode(65+oi) + '. ' + o + '</div>';
          });
          html += '</div>';
          html += '<div class="q-answer">正确答案：' + String.fromCharCode(65+q.answer) + '</div>';
          html += '<div class="q-explanation show"><div class="cn">' + (q.explanation_cn||'') + '</div><div class="en">' + (q.explanation_en||'') + '</div></div>';
          if (q.pronunciation_tips) html += '<div class="fs-12 mt-8" style="color:var(--info)">🗣️ 发音提示：' + q.pronunciation_tips + '</div>';
          html += '</div>';
        });
      } else if (m.type === 'vocabulary_game' && m.words) {
        m.words.forEach((w, wi) => {
          html += '<div class="q-item">';
          html += '<div class="q-num">单词' + (wi+1) + '</div>';
          html += '<div class="q-text">' + w.emoji + ' <strong>' + w.word + '</strong> ' + w.phonetic + '</div>';
          html += '<div class="text-sub fs-12">释义：' + w.meaning + '</div>';
          html += '<div class="text-sub fs-12">例句：' + w.example_en + ' ' + w.example_cn + '</div>';
          html += '<div class="mt-8">通关阶段：' + w.stages.map(s => this.getStageName(s.type)).join(' → ') + '</div>';
          html += '</div>';
        });
      } else if (m.type === 'writing_template') {
        html += '<div class="q-item">';
        html += '<div class="q-text">📝 ' + m.title + '</div>';
        html += '<div class="writing-banner">⚠️ ' + m.requirement_cn + '</div>';
        html += '<div class="writing-keywords">';
        m.keywords.forEach(k => html += '<span class="keyword-chip">' + k + '</span>');
        html += '</div>';
        html += '<div class="writing-essay">' + this.renderTemplateText(m) + '</div>';
        html += '<div class="q-answer">完整范文：' + m.full_text + '</div>';
        html += '<div class="q-explanation show"><div class="cn">📖 ' + (m.explanation_cn||'') + '</div><div class="en">📘 ' + (m.explanation_en||'') + '</div></div>';
        html += '</div>';
      } else if (m.questions) {
        m.questions.forEach((q, qi) => {
          html += '<div class="q-item">';
          html += '<div class="q-num">第' + (qi+1) + '题</div>';
          if (m.passage && qi === 0) html += '<div class="card mb-8" style="background:var(--bg)"><div class="fs-12 text-sub mb-4">阅读材料：</div>' + m.passage + '</div>';
          html += '<div class="q-text">' + q.question + '</div>';
          if (q.options) {
            html += '<div class="q-options">';
            q.options.forEach((o, oi) => {
              const cls = oi === q.answer ? 'correct' : '';
              html += '<div class="q-option ' + cls + '">' + String.fromCharCode(65+oi) + '. ' + o + '</div>';
            });
            html += '</div>';
          }
          html += '<div class="q-answer">正确答案：' + (q.options ? String.fromCharCode(65+q.answer) : q.answer) + '</div>';
          html += '<div class="q-explanation show"><div class="cn">' + (q.explanation_cn||'') + '</div><div class="en">' + (q.explanation_en||'') + '</div></div>';
          html += '</div>';
        });
      }
      html += '</div></div>';
    });
    detail.innerHTML = html;
  },

  getModuleIcon(type) {
    const icons = { speaking:'🎤', vocabulary_game:'🎮', reading:'📖', grammar:'📐', multiple_choice:'📝', listening:'👂', cloze:'🔗', tense:'⏰', writing_template:'✍️', ket_pet:'🏆' };
    return icons[type] || '📚';
  },

  getStageName(type) {
    const names = { learn:'看图学词', image_choice:'看图选词', meaning_choice:'选释义', spell_fill:'拼写填空' };
    return names[type] || type;
  },

  renderTemplateText(m) {
    let text = m.template;
    m.blanks.forEach(b => {
      text = text.replace('{{' + b.id + '}}', '<span class="writing-blank" style="color:var(--primary)">[' + b.hint_cn + ']</span>');
    });
    return text;
  },

  // ===== Teacher: Daily Detail =====
  renderDaily() {
    let html = '<h2 style="color:var(--primary-dark);margin-bottom:12px">📅 每日作业详情</h2>';
    html += '<div class="day-grid mb-16">';
    HOMEWORK_DATA.forEach((day, i) => {
      html += '<div class="day-card ' + (i===this.state.currentDay?'':'') + '" style="' + (i===this.state.currentDay?'border-color:var(--primary)':'') + '" onclick="App.selectDay(' + i + ')">';
      html += '<div class="day-name">' + day.day_cn + (this.isDayToday(i, 0) ? ' <span style="font-size:11px;color:var(--primary)">今天</span>' : '') + '</div>';
      html += '<div class="day-type" style="font-size:11px;color:var(--primary-dark)">' + this.getDayDateLabel(i, 0) + '</div>';
      html += '<div class="day-type">' + day.modules.map(m=>m.name_cn).join('·') + '</div>';
      html += '</div>';
    });
    html += '</div>';
    const day = HOMEWORK_DATA[this.state.currentDay];
    html += '<div id="day-detail">' + this.renderDayModules(day) + '</div>';
    return html;
  },

  selectDay(idx) {
    this.state.currentDay = idx;
    this.renderContent();
  },

  renderDayModules(day) {
    const dayIdx = HOMEWORK_DATA.indexOf(day);
    let html = '<h3 style="color:var(--primary-dark);margin:8px 0 12px">' + day.day_cn + '（' + this.getDayDateLabel(dayIdx >= 0 ? dayIdx : 0, 0) + '）· 共' + day.total_duration + '分钟</h3>';
    day.modules.forEach(m => {
      html += '<div class="module-card">';
      html += '<div class="module-header"><span class="m-name">' + this.getModuleIcon(m.type) + ' ' + m.name_cn + '</span><span class="m-duration">' + m.duration + '分钟</span></div>';
      html += '<div class="module-body">';
      // Show all questions with answers and explanations (teacher view)
      if (m.type === 'speaking' && m.questions) {
        m.questions.forEach((q, qi) => {
          html += '<div class="q-item">';
          html += '<div class="q-num">第' + (qi+1) + '题</div>';
          html += '<div class="q-text">' + q.sentence + '</div>';
          html += '<div class="text-sub fs-12">' + q.sentence_cn + '</div>';
          html += '<div class="q-options">';
          q.options.forEach((o, oi) => {
            html += '<div class="q-option ' + (oi===q.answer?'correct':'') + '">' + String.fromCharCode(65+oi) + '. ' + o + '</div>';
          });
          html += '</div>';
          html += '<div class="q-answer">✅ 正确答案：' + String.fromCharCode(65+q.answer) + '</div>';
          if (q.pronunciation_tips) html += '<div class="fs-12 mt-8" style="color:var(--info)">🗣️ ' + q.pronunciation_tips + '</div>';
          html += '<div class="q-explanation show"><div class="cn">📖 ' + q.explanation_cn + '</div><div class="en">📘 ' + q.explanation_en + '</div></div>';
          html += '</div>';
        });
      } else if (m.type === 'vocabulary_game' && m.words) {
        m.words.forEach((w, wi) => {
          html += '<div class="q-item">';
          html += '<div class="q-num">单词' + (wi+1) + '</div>';
          html += '<div class="q-text" style="font-size:18px">' + w.emoji + ' <strong>' + w.word + '</strong> ' + w.phonetic + ' = ' + w.meaning + '</div>';
          html += '<div class="text-sub fs-12">例句：' + w.example_en + ' ' + w.example_cn + '</div>';
          html += '<div class="mt-8 fs-12">闯关阶段：</div>';
          w.stages.forEach((s, si) => {
            html += '<div class="fs-12 text-sub">' + (si+1) + '. ' + this.getStageName(s.type);
            if (s.prompt) html += ' — ' + s.prompt;
            if (s.answer) html += ' (答案: ' + s.answer + ')';
            html += '</div>';
          });
          html += '</div>';
        });
      } else if (m.type === 'writing_template') {
        html += '<div class="q-item">';
        html += '<div class="q-text">✍️ ' + m.title + '</div>';
        html += '<div class="writing-banner">⚠️ ' + m.requirement_cn + '</div>';
        html += '<div class="writing-keywords">';
        m.keywords.forEach(k => html += '<span class="keyword-chip">' + k + '</span>');
        html += '</div>';
        html += '<div class="writing-essay">' + this.renderTemplateText(m) + '</div>';
        html += '<div class="q-answer">完整范文：' + m.full_text + '</div>';
        html += '<div class="q-explanation show"><div class="cn">📖 ' + m.explanation_cn + '</div><div class="en">📘 ' + m.explanation_en + '</div></div>';
        html += '</div>';
      } else if (m.questions) {
        if (m.passage) html += '<div class="card mb-8" style="background:var(--bg)"><div class="fs-12 text-sub mb-4">📄 阅读材料：</div>' + (m.passage_cn||'') + '<br>' + m.passage + '</div>';
        m.questions.forEach((q, qi) => {
          html += '<div class="q-item">';
          html += '<div class="q-num">第' + (qi+1) + '题</div>';
          html += '<div class="q-text">' + q.question + '</div>';
          if (q.options) {
            html += '<div class="q-options">';
            q.options.forEach((o, oi) => {
              html += '<div class="q-option ' + (oi===q.answer?'correct':'') + '">' + String.fromCharCode(65+oi) + '. ' + o + '</div>';
            });
            html += '</div>';
          }
          html += '<div class="q-answer">✅ 正确答案：' + (q.options ? String.fromCharCode(65+q.answer) : q.answer) + '</div>';
          html += '<div class="q-explanation show"><div class="cn">📖 ' + q.explanation_cn + '</div><div class="en">📘 ' + q.explanation_en + '</div></div>';
          html += '</div>';
        });
      }
      html += '</div></div>';
    });
    return html;
  },

  // ===== Teacher: Edit =====
  renderEdit() {
    let html = '<h2 style="color:var(--primary-dark);margin-bottom:12px">✏️ 作业编辑</h2>';
    html += '<p class="text-sub mb-16">点击模块可修改名称、时长和说明</p>';
    HOMEWORK_DATA.forEach((day, di) => {
      html += '<div class="card mb-16">';
      html += '<div class="card-title">' + day.day_cn + '（本周' + this.getDayDateLabel(di, 0) + '）· ' + day.theme_cn + ' · 共' + day.total_duration + '分钟</div>';
      day.modules.forEach((m, mi) => {
        html += '<div class="flex-between mb-8 p-8" style="background:var(--bg);border-radius:8px">';
        html += '<span>' + this.getModuleIcon(m.type) + ' ' + m.name_cn + ' (' + m.duration + '分钟)</span>';
        html += '<button class="btn btn-outline btn-sm" onclick="App.editModule(' + di + ',' + mi + ')">编辑</button>';
        html += '</div>';
      });
      html += '</div>';
    });
    return html;
  },

  editModule(di, mi) {
    const m = HOMEWORK_DATA[di].modules[mi];
    this.showModal(`
      <div class="modal-header"><div class="modal-title">编辑模块</div><button class="modal-close" onclick="App.closeModal()">&times;</button></div>
      <div class="modal-body">
        <div class="form-group"><label>模块名称</label><input type="text" id="edit-name" value="${m.name_cn}"></div>
        <div class="form-group"><label>时长（分钟）</label><input type="number" id="edit-duration" value="${m.duration}"></div>
        <div class="form-group"><label>说明</label><textarea id="edit-note" rows="3" placeholder="模块说明">${m.requirement_cn||m.theme_cn||''}</textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="App.saveEdit(${di},${mi})">保存</button>
        <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
      </div>
    `);
  },

  saveEdit(di, mi) {
    const m = HOMEWORK_DATA[di].modules[mi];
    m.name_cn = document.getElementById('edit-name').value;
    m.duration = parseInt(document.getElementById('edit-duration').value);
    const note = document.getElementById('edit-note').value;
    if (m.requirement_cn !== undefined) m.requirement_cn = note;
    // Recalculate total duration
    HOMEWORK_DATA[di].total_duration = HOMEWORK_DATA[di].modules.reduce((s,mod) => s + mod.duration, 0);
    this.closeModal();
    this.renderContent();
  },

  // ===== Teacher: Check-in Monitor =====
  renderCheckin() {
    let html = '<h2 style="color:var(--primary-dark);margin-bottom:12px">📊 打卡监控</h2>';
    // Note: no auto-generated demo data - show real data only
    // Summary
    html += '<div class="stat-row mb-16">';
    let totalDone = 0, totalUndone = 0;
    this.state.students.forEach(s => {
      HOMEWORK_DATA.forEach((d, di) => {
        const k = s.id + '_d' + di;
        if (this.state.checkins[k] && this.state.checkins[k].done) totalDone++;
        else totalUndone++;
      });
    });
    html += '<div class="stat-box"><div class="num" style="color:var(--success)">' + totalDone + '</div><div class="label">已打卡</div></div>';
    html += '<div class="stat-box"><div class="num" style="color:var(--danger)">' + totalUndone + '</div><div class="label">未打卡</div></div>';
    html += '<div class="stat-box"><div class="num">' + Math.round(totalDone/(totalDone+totalUndone)*100) + '%</div><div class="label">完成率</div></div>';
    html += '</div>';

    // Table
    html += '<div class="card"><div class="checkin-table"><table class="data-table"><thead><tr><th>学生</th>';
    HOMEWORK_DATA.forEach((d, di) => html += '<th>' + d.day_cn + '<br><span style="font-weight:400;font-size:10px;color:var(--text-sub,#888)">' + this.getDayDateLabel(di, 0) + '</span></th>');
    html += '<th>总完成</th><th>平均正确率</th></tr></thead><tbody>';
    this.state.students.forEach(s => {
      html += '<tr><td>' + s.name + '</td>';
      let doneCount = 0, totalCorrect = 0, correctCount = 0;
      HOMEWORK_DATA.forEach((d, di) => {
        const k = s.id + '_d' + di;
        const ck = this.state.checkins[k];
        // A record exists from the first answer on. Show the dot either way —
        // 'started but unfinished' is what the teacher most wants to see —
        // but only count a finished day toward doneCount.
        if (ck) {
          if (ck.done) doneCount++;
          if (ck.correctRate) { totalCorrect += ck.correctRate; correctCount++; }
          const cls = ck.completed === 'partial' ? 'partial' : 'done';
          html += '<td><span class="checkin-dot ' + cls + '" title="' + ck.time + ' 正确率' + ck.correctRate + '%">✓</span></td>';
        } else {
          html += '<td><span class="checkin-dot undone">✗</span></td>';
        }
      });
      html += '<td>' + doneCount + '/' + HOMEWORK_DATA.length + '</td>';
      html += '<td>' + (correctCount > 0 ? Math.round(totalCorrect/correctCount) + '%' : '-') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
  },

  // ===== Teacher: Score Analysis =====
  renderScores() {
    let html = '<h2 style="color:var(--primary-dark);margin-bottom:12px">📈 成绩分析</h2>';
    HOMEWORK_DATA.forEach((day, di) => {
      html += '<div class="card mb-16">';
      html += '<div class="card-title">' + day.day_cn + '（' + this.getDayDateLabel(di, 0) + '）· ' + day.theme_cn + '</div>';
      day.modules.forEach(m => {
        // Calculate demo scores
        const scores = [];
        this.state.students.forEach(s => {
          const k = s.id + '_d' + di;
          const ck = this.state.checkins[k];
          if (ck && ck.done && ck.correctRate) scores.push(ck.correctRate);
        });
        if (scores.length > 0) {
          const avg = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
          const max = Math.max(...scores);
          const min = Math.min(...scores);
          const passRate = Math.round(scores.filter(s=>s>=60).length/scores.length*100);
          html += '<div class="flex-between mb-8 p-8" style="background:var(--bg);border-radius:8px">';
          html += '<span>' + this.getModuleIcon(m.type) + ' ' + m.name_cn + '</span>';
          html += '<span>平均' + avg + '% | 最高' + max + '% | 最低' + min + '% | 及格率' + passRate + '%</span>';
          html += '</div>';
        }
      });
      html += '</div>';
    });
    return html;
  },

  // ===== Teacher: Error Book =====
  renderErrorBook() {
    let html = '<h2 style="color:var(--primary-dark);margin-bottom:12px">❌ 班级错题本</h2>';
    // Real wrong answers. This used to invent them: it took any student whose
    // day-level correctRate was under 80 and flagged a random half of the
    // questions as wrong, so the same page showed different errors on reload.
    const errors = [];
    HOMEWORK_DATA.forEach((day, di) => {
      day.modules.forEach((m, mi) => {
        if (m.questions) {
          m.questions.forEach((q, qi) => {
            const wrongStudents = [];
            this.state.students.forEach(s => {
              const a = this.state.answers[Api.answerKey(s.id, di, mi, qi)];
              if (a && !a.correct) wrongStudents.push(s.name);
            });
            if (wrongStudents.length > 0) {
              errors.push({ day: day.day_cn, module: m.name_cn, question: q.question || q.sentence, answer: q.options ? String.fromCharCode(65+q.answer) : q.answer, explanation_cn: q.explanation_cn, explanation_en: q.explanation_en, students: wrongStudents });
            }
          });
        }
      });
    });
    errors.sort((a,b) => b.students.length - a.students.length);
    errors.forEach(e => {
      html += '<div class="error-item">';
      html += '<div class="e-q"><strong>' + e.day + '·' + e.module + '</strong> ' + e.question + '</div>';
      html += '<div class="q-answer">正确答案：' + e.answer + '</div>';
      html += '<div class="e-students">❌ 做错学生(' + e.students.length + '人)：' + e.students.join('、') + '</div>';
      html += '<div class="q-explanation show"><div class="cn">📖 ' + e.explanation_cn + '</div><div class="en">📘 ' + e.explanation_en + '</div></div>';
      html += '</div>';
    });
    if (errors.length === 0) html += '<p class="text-sub text-center">暂无错题记录</p>';
    return html;
  },

  // ===== Teacher: Print Error Sheet =====
  renderPrint() {
    let html = '<h2 style="color:var(--primary-dark);margin-bottom:12px">🖨️ 错题卷打印</h2>';
    html += '<p class="text-sub mb-16">选择学生生成个性化A4错题卷，答案默认隐藏，可切换显示</p>';
    html += '<div class="flex gap-8 mb-16" style="flex-wrap:wrap">';
    this.state.students.forEach(s => {
      html += '<button class="btn btn-outline btn-sm" onclick="App.genErrorSheet(\'' + s.id + '\')">' + s.name + '</button>';
    });
    html += '</div>';
    html += '<div id="print-area"></div>';
    return html;
  },

  genErrorSheet(sid) {
    const student = this.state.students.find(s => s.id === sid);
    if (!student) return;
    // Collect this student's errors — the questions they actually got wrong.
    const errors = [];
    HOMEWORK_DATA.forEach((day, di) => {
      day.modules.forEach((m, mi) => {
        if (m.questions) {
          m.questions.forEach((q, qi) => {
            const a = this.state.answers[Api.answerKey(student.id, di, mi, qi)];
            if (a && !a.correct) {
              errors.push({ day: day.day_cn, module: m.name_cn, q: q, type: m.type });
            }
          });
        }
      });
    });
    // If too few errors, add similar questions
    const similarQuestions = [];
    if (errors.length < 5) {
      const pool = [
        { question: 'He ___ (go) to school by bus every day.', answer: 'goes', explanation_cn: '第三人称单数，every day 表示一般现在时，go 变 goes。', explanation_en: 'Third person singular with habitual action uses goes.' },
        { question: 'I ___ (read) a book when the phone rang.', answer: 'was reading', explanation_cn: '过去进行时，was/were + doing，表示过去某时刻正在进行的动作。', explanation_en: 'Past continuous: was/were + doing for an action in progress in the past.' },
        { question: 'She has ___ (finish) her homework already.', answer: 'finished', explanation_cn: '现在完成时 has + 过去分词，already 用于肯定句。', explanation_en: 'Present perfect: has + past participle, already for affirmative.' },
        { question: '___ interesting story it is!', answer: 'What an', explanation_cn: '感叹句 What (a/an) + adj + noun！story 可数名词单数，interesting 元音开头用 an。', explanation_en: 'Exclamatory: What (a/an) + adj + noun! Singular countable with vowel sound uses an.' },
        { question: 'There ___ many apples on the tree.', answer: 'are', explanation_cn: 'There be 就近原则，apples 复数用 are。', explanation_en: 'There be follows proximity principle; plural apples uses are.' },
      ];
      pool.forEach((p, i) => {
        if (errors.length + similarQuestions.length < 6) {
          similarQuestions.push(p);
        }
      });
    }

    let html = '<div class="a4-print-area" id="a4-print-' + sid + '">';
    html += '<div class="a4-sheet" id="a4-sheet-' + sid + '">';
    html += '<h1>英语错题巩固卷</h1>';
    html += '<div class="a4-info">姓名：___________  日期：___________  得分：___________</div>';
    if (errors.length > 0) {
      html += '<h3 style="margin:12px 0 8px">一、错题重做（共' + errors.length + '题）</h3>';
      errors.forEach((e, i) => {
        html += '<div class="a4-q">';
        html += '<div class="a4-q-num">' + (i+1) + '. [' + e.day + '·' + e.module + '] ' + (e.q.question || e.q.sentence) + '</div>';
        if (e.q.options) {
          e.q.options.forEach((o, oi) => {
            html += '<div style="margin-left:20px">' + String.fromCharCode(65+oi) + '. ' + o + '</div>';
          });
        }
        html += '<div class="a4-write-area"></div>';
        html += '<div class="a4-write-area"></div>';
        // Hidden answer (teacher can toggle)
        html += '<div class="a4-ans" id="ans-' + sid + '-' + i + '">正确答案：' + (e.q.options ? String.fromCharCode(65+e.q.answer) : e.q.answer) + '<br>解析：' + (e.q.explanation_cn||'') + '<br>Explanation: ' + (e.q.explanation_en||'') + '</div>';
        html += '</div>';
      });
    }
    if (similarQuestions.length > 0) {
      html += '<h3 style="margin:16px 0 8px">二、相似题型巩固练习（共' + similarQuestions.length + '题）</h3>';
      similarQuestions.forEach((sq, i) => {
        html += '<div class="a4-q a4-similar">';
        html += '<div class="a4-q-num">' + (errors.length+i+1) + '. ' + sq.question + '</div>';
        html += '<div class="a4-write-area"></div>';
        html += '<div class="a4-ans" id="sim-ans-' + sid + '-' + i + '">正确答案：' + sq.answer + '<br>解析：' + sq.explanation_cn + '<br>Explanation: ' + sq.explanation_en + '</div>';
        html += '</div>';
      });
    }
    html += '<div style="margin-top:20px;text-align:center;font-size:10pt;color:#999">Amy老师英语打卡平台 | 错题更少，进步更快</div>';
    html += '</div></div>';

    // Controls
    html += '<div class="no-print mt-16 text-center" style="padding:12px">';
    html += '<button class="btn btn-outline btn-sm" onclick="App.toggleAnswers(\'' + sid + '\',' + errors.length + ',' + similarQuestions.length + ')">👁️ 显示/隐藏答案</button> ';
    html += '<button class="btn btn-primary btn-sm" onclick="App.doPrint()">🖨️ 打印</button>';
    html += '</div>';

    document.getElementById('print-area').innerHTML = html;
  },

  toggleAnswers(sid, errCount, simCount) {
    for (let i = 0; i < errCount; i++) {
      const el = document.getElementById('ans-' + sid + '-' + i);
      if (el) el.classList.toggle('show');
    }
    for (let i = 0; i < simCount; i++) {
      const el = document.getElementById('sim-ans-' + sid + '-' + i);
      if (el) el.classList.toggle('show');
    }
  },

  doPrint() { window.print(); },

  // ===== Teacher: Speaking Records =====
  // Was unreachable: it referenced an undefined `di` and threw on open, and
  // the scores under it were Math.random(). Now it renders the real recording
  // records, or an honest empty state when there are none.
  renderSpeakingRecords() {
    let html = '<h2 style="color:var(--primary-dark);margin-bottom:12px">🎤 口语练习记录</h2>';
    html += '<p class="text-sub mb-16">学生朗读录音的得分记录</p>';

    const records = this.state.speakingRecords || [];
    if (records.length === 0) {
      html += '<div class="card text-center text-sub">暂无口语记录<br>' +
              '<span class="fs-12">学生在字母/音节模块完成朗读后，记录会出现在这里</span></div>';
      return html;
    }

    // Group by day, newest first within each day.
    const byDay = {};
    records.forEach(r => {
      const k = r.dayIdx === undefined ? 'other' : r.dayIdx;
      (byDay[k] = byDay[k] || []).push(r);
    });

    const nameOf = (sid) => {
      const s = this.state.students.find(st => st.id === sid);
      return s ? s.name : (sid || '未知学生');
    };

    Object.keys(byDay).sort((a, b) => a - b).forEach(k => {
      const day = HOMEWORK_DATA[k];
      const rows = byDay[k].slice().sort((a, b) => (b.at || '').localeCompare(a.at || ''));
      html += '<div class="card mb-16">';
      html += '<div class="card-title">' + (day ? day.day_cn + '（' + this.getDayDateLabel(Number(k), 0) + '）' : '未归类') + '</div>';
      html += '<table class="data-table"><thead><tr><th>学生</th><th>内容</th><th>轮次</th><th>得分</th><th>分数来源</th><th>时间</th><th>录音</th></tr></thead><tbody>';
      rows.forEach(r => {
        const score = r.score || 0;
        // Where the number came from matters more than the number: none of
        // these measure pronunciation.
        const src = r.source === 'asr' ? '语音识别比对'
                  : r.source === 'self' ? '学生自评'
                  : '音量';
        html += '<tr><td>' + nameOf(r.studentId) + '</td>';
        html += '<td>' + (r.label || '-') + '</td>';
        html += '<td>' + (r.round || 1) + '</td>';
        html += '<td>' + score + (r.wordTotal ? ' <span class="fs-12 text-sub">(' + r.okCount + '/' + r.wordTotal + '词)</span>' : '') + '</td>';
        html += '<td class="fs-12 text-sub">' + src
             + (r.spoken ? '<br><span style="color:var(--ink-3)">识别：' + r.spoken + '</span>' : '')
             + ((r.wrongWords && r.wrongWords.length)
                 ? '<br><span style="color:#D6321F">读错：' + r.wrongWords.map(w=>w.expected+'→'+w.heard).join('、') + '</span>' : '')
             + ((r.missedWords && r.missedWords.length)
                 ? '<br><span style="color:var(--ink-3)">漏读：' + r.missedWords.join('、') + '</span>' : '')
             + '</td>';
        html += '<td class="fs-12">' + (r.at ? r.at.slice(11, 16) : '-') + '</td>';
        html += '<td>' + (r.audioUrl
          ? '<audio controls preload="none" src="' + r.audioUrl + '" style="height:30px;max-width:200px"></audio>'
          : '<span class="fs-12 text-sub">音频已失效</span>') + '</td></tr>';
      });
      html += '</tbody></table>';
      // The volume-based score says nothing about pronunciation — say so
      // rather than letting the teacher read it as an assessment.
      html += '<p class="fs-12 text-sub mt-8">以上分数来自音量、学生自评或语音识别比对，'
           + '<strong>都不能代表发音准确度</strong>。请点开录音试听判断。</p>';
      html += '</div>';
    });
    return html;
  },

  // ===== Teacher: Student Management =====
  renderStudents() {
    let html = '<h2 style="color:var(--primary-dark);margin-bottom:12px">👥 学生管理</h2>';
    html += '<div class="flex-between mb-16">';
    html += '<div class="stat-row" style="flex:1">';
    html += '<div class="stat-box"><div class="num">' + this.state.students.length + '</div><div class="label">总注册</div></div>';
    const pending = this.state.students.filter(s => !s.approved || !s.class);
    html += '<div class="stat-box"><div class="num" style="color:var(--warning)">' + pending.length + '</div><div class="label">待分配</div></div>';
    const approved = this.state.students.filter(s => s.approved && s.class);
    html += '<div class="stat-box"><div class="num" style="color:var(--success)">' + approved.length + '</div><div class="label">已分配</div></div>';
    html += '<div class="stat-box"><div class="num">' + this.state.classes.length + '</div><div class="label">班级数</div></div>';
    html += '</div>';
    html += '<button class="btn btn-outline btn-sm" onclick="App.manualSync()">🔄 立即同步</button>';
    html += '</div>';

    html += '<div class="card mb-16" style="background:var(--success-light);border:1px solid var(--success)">';
    html += '<div class="fs-12" style="color:var(--success)">✅ 云端同步：' + this._syncStatusText() + '（每30秒自动刷新，老师手机/电脑任意一端操作，另一端自动更新）</div>';
    html += '</div>';

    // Pending students (need class assignment)
    if (pending.length > 0) {
      html += '<h3 style="color:var(--warning);margin-bottom:8px">⏳ 待分配学生（' + pending.length + '人）</h3>';
      html += '<p class="text-sub fs-12 mb-8">这些学生已注册，等待你分配班级</p>';
      pending.forEach(s => {
        html += '<div class="assign-card">';
        html += '<div class="ac-info">';
        html += '<div><span class="ac-name">' + s.name + '</span> <span class="ac-phone">' + (s.phone||'-') + '</span></div>';
        html += '<span class="badge badge-pending">待分配</span>';
        html += '</div>';
        html += '<div class="ac-actions">';
        // Class assignment dropdown
        html += '<select id="assign-sel-' + s.id + '" style="padding:4px 8px;border-radius:6px;border:1.5px solid #FFE0CC;font-size:12px">';
        html += '<option value="">-- 选择班级 --</option>';
        this.state.classes.forEach(c => {
          html += '<option value="' + c + '">' + c + '</option>';
        });
        html += '</select>';
        html += '<button class="btn btn-primary btn-sm" onclick="App.assignStudent(\'' + s.id + '\')">✅ 分配班级</button>';
        html += '<button class="btn btn-outline btn-sm" onclick="App.rejectStudent(\'' + s.id + '\')">🗑️ 删除</button>';
        html += '</div>';
        html += '<div class="fs-12 text-sub mt-4">注册时间：' + (s.registeredAt ? new Date(s.registeredAt).toLocaleString('zh-CN') : '-') + '</div>';
        html += '</div>';
      });
    }

    // Approved students table
    if (approved.length > 0) {
      html += '<h3 style="color:var(--success);margin:16px 0 8px">✅ 已分配学生（' + approved.length + '人）</h3>';
      html += '<div class="card"><table class="data-table"><thead><tr><th>备注名</th><th>班级</th><th>手机号</th><th>注册时间</th><th>操作</th></tr></thead><tbody>';
      approved.forEach(s => {
        html += '<tr><td>' + s.name + '</td><td>' + (s.class||'-') + '</td><td>' + (s.phone||'-') + '</td>';
        html += '<td class="fs-12">' + (s.registeredAt ? new Date(s.registeredAt).toLocaleDateString('zh-CN') : '-') + '</td>';
        html += '<td><button class="btn btn-outline btn-sm" onclick="App.removeStudent(\'' + s.id + '\')">移除</button></td></tr>';
      });
      html += '</tbody></table></div>';
    }

    if (this.state.students.length === 0) {
      html += '<div class="card text-center text-sub">暂无注册学生<br><span class="fs-12">学生登录后会自动出现在这里</span></div>';
    }
    return html;
  },

  // Assign student to a class (also approves them)
  async assignStudent(sid) {
    const student = this.state.students.find(s => s.id === sid || s.phone === sid);
    if (!student) return;
    const sel = document.getElementById('assign-sel-' + sid);
    if (!sel || !sel.value) { alert('请选择一个班级'); return; }
    const className = sel.value;
    student.class = className;
    student.approved = true;
    await Api.saveStudent(student);
    this.syncToCloud();
    this.renderContent();
  },

  // Reject / delete a student
  async rejectStudent(sid) {
    if (!confirm('确认删除该学生？删除后该手机号将无法登录。')) return;
    const student = this.state.students.find(s => s.id === sid || s.phone === sid);
    if (!student) return;
    // Delete locally
    this.state.students = await Api.deleteStudent(student);
    delete this.state.parentStudents[student.phone];
    this.syncToCloud();
    this.renderContent();
  },

  addStudent() {
    let classOptions = this.state.classes.map(c => '<option value="' + c + '">' + c + '</option>').join('');
    this.showModal(
      '<div class="modal-header"><div class="modal-title">添加学生</div><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label>备注名（中文名-英文名）</label><input type="text" id="add-name" placeholder="如：马慧-Amy"></div>' +
        '<div class="form-group"><label>班级</label><select id="add-class"><option value="">-- 不分配 --</option>' + classOptions + '</select></div>' +
        '<div class="form-group"><label>手机号</label><input type="tel" id="add-phone" placeholder="11位手机号"></div>' +
      '</div>' +
      '<div class="modal-footer"><button class="btn btn-primary" onclick="App.saveStudent()">添加</button><button class="btn btn-outline" onclick="App.closeModal()">取消</button></div>'
    );
  },

  async saveStudent() {
    const name = document.getElementById('add-name').value.trim();
    const cls = document.getElementById('add-class').value;
    const phone = document.getElementById('add-phone').value.trim();
    if (!name || !name.includes('-')) { alert('请按"中文名-英文名"格式填写'); return; }
    if (!phone || phone.length < 11) { alert('请输入正确的11位手机号'); return; }
    const student = {
      id: 's' + Date.now(),
      name: name,
      phone: phone,
      parentPhone: phone,
      class: cls,
      approved: !!cls,
      registeredAt: new Date().toISOString()
    };
    this.state.students.push(student);
    this.state.parentStudents[phone] = { name: name, class: cls, approved: !!cls };
    await Api.saveStudent(student);
    await Api.saveParentStudent(phone, this.state.parentStudents[phone]);
    this.syncToCloud();
    this.closeModal();
    this.renderContent();
  },

  async removeStudent(sid) {
    if (!confirm('确认移除该学生？')) return;
    const student = this.state.students.find(s => s.id === sid);
    if (!student) return;
    student.class = '';
    student.approved = false;
    await Api.saveStudent(student);
    this.syncToCloud();
    this.renderContent();
  },

  // ===== Teacher: Class Management =====
  renderClassMgmt() {
    let html = '<h2 style="color:var(--primary-dark);margin-bottom:12px">🏫 班级管理</h2>';
    html += '<div class="stat-row mb-16">';
    html += '<div class="stat-box"><div class="num">' + this.state.classes.length + '</div><div class="label">班级数</div></div>';
    let totalStudents = this.state.students.filter(s => s.approved && s.class).length;
    html += '<div class="stat-box"><div class="num">' + totalStudents + '</div><div class="label">已分配学生</div></div>';
    html += '</div>';
    html += '<button class="btn btn-primary btn-sm mb-16" onclick="App.addClass()">+ 创建班级</button>';
    html += '<button class="btn btn-outline btn-sm mb-16" onclick="App.manualSync()" style="margin-left:8px">🔄 立即同步</button>';

    if (this.state.classes.length === 0) {
      html += '<div class="card text-center text-sub">暂无班级<br><span class="fs-12">点击上方按钮创建第一个班级</span></div>';
    }

    this.state.classes.forEach(cls => {
      const clsStudents = this.state.students.filter(s => s.class === cls && s.approved);
      const count = clsStudents.length;
      html += '<div class="card mb-16">';
      html += '<div class="flex-between">';
      html += '<span class="card-title">🏫 ' + cls + '</span>';
      html += '<div class="flex gap-8">';
      html += '<button class="btn btn-outline btn-sm" onclick="App.renameClass(\'' + cls.replace(/'/g,"\\'") + '\')">✏️ 改名</button>';
      html += '<button class="btn btn-outline btn-sm" onclick="App.deleteClass(\'' + cls.replace(/'/g,"\\'") + '\')">🗑️ 删除</button>';
      html += '</div>';
      html += '</div>';
      html += '<div class="text-sub fs-12 mt-8">学生人数：' + count + '人</div>';
      if (clsStudents.length > 0) {
        html += '<table class="data-table mt-8"><thead><tr><th>备注名</th><th>手机号</th><th>注册时间</th><th>操作</th></tr></thead><tbody>';
        clsStudents.forEach(s => {
          html += '<tr><td>' + s.name + '</td><td>' + (s.phone||'-') + '</td>';
          html += '<td class="fs-12">' + (s.registeredAt ? new Date(s.registeredAt).toLocaleDateString('zh-CN') : '-') + '</td>';
          html += '<td><button class="btn btn-outline btn-sm" onclick="App.removeFromClass(\'' + s.id + '\')">移出班级</button></td></tr>';
        });
        html += '</tbody></table>';
      } else {
        html += '<p class="text-sub fs-12 mt-8">暂无学生</p>';
      }
      html += '</div>';
    });
    return html;
  },

  addClass() {
    this.showModal(
      '<div class="modal-header"><div class="modal-title">创建班级</div><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label>班级名称</label><input type="text" id="add-class-name" placeholder="如：五年级A班" autofocus></div>' +
      '</div>' +
      '<div class="modal-footer"><button class="btn btn-primary" onclick="App.saveClass()">创建</button><button class="btn btn-outline" onclick="App.closeModal()">取消</button></div>'
    );
  },

  async saveClass() {
    const name = document.getElementById('add-class-name').value.trim();
    if (!name) { alert('请输入班级名称'); return; }
    if (this.state.classes.includes(name)) { alert('该班级已存在'); return; }
    this.state.classes.push(name);
    await Api.saveClasses(this.state.classes);
    this.syncToCloud();
    this.closeModal();
    this.renderContent();
  },

  renameClass(oldName) {
    this.showModal(
      '<div class="modal-header"><div class="modal-title">重命名班级</div><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label>当前名称</label><input type="text" value="' + oldName + '" disabled></div>' +
        '<div class="form-group"><label>新名称</label><input type="text" id="rename-class-name" placeholder="输入新班级名称" value="' + oldName + '" autofocus></div>' +
      '</div>' +
      '<div class="modal-footer"><button class="btn btn-primary" onclick="App.saveRenameClass(\'' + oldName.replace(/'/g,"\\'") + '\')">保存</button><button class="btn btn-outline" onclick="App.closeModal()">取消</button></div>'
    );
  },

  async saveRenameClass(oldName) {
    const newName = document.getElementById('rename-class-name').value.trim();
    if (!newName) { alert('请输入新班级名称'); return; }
    if (oldName === newName) { this.closeModal(); return; }
    if (this.state.classes.includes(newName)) { alert('该名称已存在'); return; }
    // Update classes list
    const idx = this.state.classes.indexOf(oldName);
    if (idx >= 0) this.state.classes[idx] = newName;
    // Update all students in this class
    this.state.students.forEach(s => {
      if (s.class === oldName) {
        s.class = newName;
      }
    });
    await Api.saveClasses(this.state.classes);
    await Api.saveStudents(this.state.students);
    this.syncToCloud();
    this.closeModal();
    this.renderContent();
  },

  async deleteClass(cls) {
    const count = this.state.students.filter(s => s.class === cls && s.approved).length;
    if (count > 0) {
      if (!confirm('班级"' + cls + '"下还有' + count + '名学生。删除班级后学生将变为未分配状态。确认删除？')) return;
      // Unassign students
      this.state.students.forEach(s => {
        if (s.class === cls) {
          s.class = '';
          s.approved = false;
        }
      });
    } else {
      if (!confirm('确认删除班级"' + cls + '"？')) return;
    }
    this.state.classes = this.state.classes.filter(c => c !== cls);
    await Api.saveClasses(this.state.classes);
    await Api.saveStudents(this.state.students);
    this.syncToCloud();
    this.renderContent();
  },

  async removeFromClass(sid) {
    if (!confirm('确认将该学生移出班级？')) return;
    const student = this.state.students.find(s => s.id === sid);
    if (!student) return;
    student.class = '';
    student.approved = false;
    await Api.saveStudent(student);
    this.syncToCloud();
    this.renderContent();
  },

  // ===== Student/Parent: Today's Homework =====
  renderToday() {
    // Students always see TODAY's real homework (weekday-based).
    // Teachers can freely switch days for preview (default: today).
    let todayIdx = this.state.currentDay;
    if (todayIdx === undefined || todayIdx === null) {
      todayIdx = this.getTodayWeekdayIdx();
    }
    if (!this.isTeacher()) {
      // Reset to real today on every render so the student never gets stuck
      // on an old day (e.g. app left open overnight)
      todayIdx = this.getTodayWeekdayIdx();
      this.state.currentDay = todayIdx;
    }
    // Students get the one-question-per-screen stage. The teacher keeps the
    // scrolling list — they preview whole days, not answer them.
    if (!this.isTeacher()) return this.renderStage(todayIdx);

    const day = HOMEWORK_DATA[todayIdx];
    const dateLabel = this.getDayDateLabel(todayIdx, 0);
    let html = '<h2 style="color:var(--primary-dark);margin-bottom:8px">📝 今日作业</h2>';
    html += '<div class="card mb-16" style="background:var(--primary-light);border:none">';
    html += '<div class="flex-between"><span>📅 ' + day.day_cn + ' · ' + dateLabel + (this.isDayToday(todayIdx, 0) ? '（今天）' : '') + '</span><span class="badge badge-primary">' + day.total_duration + '分钟</span></div>';
    html += '<div class="fs-12 text-sub mt-8">' + day.theme_cn + '</div>';
    html += '</div>';

    // Audio enable banner for non-teacher
    if (!this.isTeacher() && !this.state.audioEnabled) {
      html += '<div class="audio-enable-banner">';
      html += '<div class="ae-icon">🔊</div>';
      html += '<div class="ae-title">点击开启语音朗读</div>';
      html += '<div class="ae-desc">开启后，每道题会自动用纯正美音朗读英语</div>';
      html += '<button class="ae-btn" onclick="App.enableAudio()">🔊 开启语音</button>';
      html += '</div>';
    }

    // Day selector - only for teacher, non-teacher sees just today
    if (this.isTeacher()) {
      html += '<div class="day-grid mb-16">';
      HOMEWORK_DATA.forEach((d, i) => {
        const isToday = i === todayIdx;
        html += '<div class="day-card" style="' + (isToday?'border-color:var(--primary)':'') + '" onclick="App.switchTodayDay(' + i + ')">';
        html += '<div class="day-name">' + d.day_cn + '</div>';
        html += '<div class="day-type" style="font-size:11px">' + this.getDayDateLabel(i, 0) + (this.isDayToday(i, 0) ? ' · 今天' : '') + '</div>';
        html += '<div class="day-type">' + d.modules.map(m=>m.name_cn).join('·') + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    // Modules for today
    day.modules.forEach((m, mi) => {
      html += '<div class="module-card">';
      html += '<div class="module-header"><span class="m-name">' + this.getModuleIcon(m.type) + ' ' + m.name_cn + '</span><span class="m-duration">' + m.duration + '分钟</span></div>';
      html += '<div class="module-body" id="mod-body-' + mi + '">' + this.renderModuleInteractive(m, mi, todayIdx) + '</div>';
      html += '</div>';
    });
    return html;
  },

  switchTodayDay(idx) {
    this.state.currentDay = idx;
    this.renderContent();
  },

  renderModuleInteractive(m, mi, dayIdx) {
    if (m.type === 'speaking') {
      return this.renderSpeakingStudent(m, mi, dayIdx);
    } else if (m.type === 'vocabulary_game') {
      return this.renderVocabGame(m, mi, dayIdx);
    } else if (m.type === 'writing_template') {
      return this.renderWritingTemplate(m, mi, dayIdx);
    } else if (m.questions) {
      return this.renderQuestionsStudent(m, mi, dayIdx);
    }
    return '<p class="text-sub">暂无内容</p>';
  },

  // Speaking - student interactive
  renderSpeakingStudent(m, mi, dayIdx) {
    let html = '<div id="speaking-area-' + mi + '">';
    // Audio enable check
    if (!this.state.audioEnabled) {
      html += '<div class="audio-enable-banner">';
      html += '<div class="ae-icon">🔊</div>';
      html += '<div class="ae-title">点击开启语音朗读</div>';
      html += '<div class="ae-desc">开启后，每道题会自动用纯正美音朗读英语</div>';
      html += '<button class="ae-btn" onclick="App.enableAudio()">🔊 开启语音</button>';
      html += '</div>';
      html += '</div>';
      return html;
    }
    html += '<div id="sp-content-' + mi + '">' + this.renderSpeakingQuestion(m, mi, 0, dayIdx) + '</div>';
    html += '</div>';
    return html;
  },

  // Shuffle array in place (for randomizing answer order)
  _shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  },

  // Get shuffled options for a speaking question, with mapping to original answer index
  _getShuffledSpeakingOptions(q) {
    var origOptions = q.options;
    var origAnswer = q.answer;
    var indices = origOptions.map(function(_, i) { return i; });
    var shuffledIndices = this._shuffle(indices);
    var shuffledOptions = shuffledIndices.map(function(i) { return origOptions[i]; });
    var newAnswerIdx = shuffledIndices.indexOf(origAnswer);
    return { options: shuffledOptions, answer: newAnswerIdx };
  },

  renderSpeakingQuestion(m, mi, qi, dayIdx) {
    const q = m.questions[qi];
    // Shuffle options for this question
    var shuffled = this._getShuffledSpeakingOptions(q);
    // Store shuffled data for this question instance
    if (!this._speakingShuffle) this._speakingShuffle = {};
    this._speakingShuffle[mi + '-' + qi] = shuffled;

    let html = '<div class="speaking-card">';
    html += '<div class="auto-read-badge"><svg class="icon icon-sm speaking-anim"><use href="#i-sound"/></svg> 正在朗读…</div>';
    html += '<div class="fs-12 text-sub">第' + (qi+1) + '题 / 共' + m.questions.length + '题</div>';
    html += '<div class="vocab-progress mt-8"><div class="fill" style="width:' + (qi/m.questions.length*100) + '%"></div></div>';
    html += '<div class="speak-sentence">' + q.sentence + '</div>';
    html += '<div class="speak-sentence-cn">' + q.sentence_cn + '</div>';
    html += '<button class="speak-btn play" onclick="App.playSentence(' + mi + ',' + qi + ',\'' + dayIdx + '\')"><svg class="icon icon-sm"><use href="#i-sound"/></svg> 重新听</button>';
    // Options disabled until reading finishes
    html += '<div class="speak-options" id="sp-opts-' + mi + '" style="opacity:0.4;pointer-events:none">';
    shuffled.options.forEach((o, oi) => {
      html += '<div class="speak-option" onclick="App.selectSpeakAnswer(' + mi + ',' + qi + ',' + oi + ',' + dayIdx + ')">' + String.fromCharCode(65+oi) + '. ' + o + '</div>';
    });
    html += '</div>';
    html += '<div class="listen-wait" id="sp-wait-' + mi + '" style="text-align:center;padding:8px;color:var(--text-sub);font-size:12px">⏳ 请先听完整朗读，再选择答案</div>';
    html += '<div class="speak-tip" id="sp-tip-' + mi + '"></div>';
    html += '<div id="sp-read-' + mi + '"></div>';
    html += '</div>';
    // Auto-play the sentence, then enable options
    this.autoSpeak(q.sentence, function() {
      var optsEl = document.getElementById('sp-opts-' + mi);
      var waitEl = document.getElementById('sp-wait-' + mi);
      if (optsEl) { optsEl.style.opacity = '1'; optsEl.style.pointerEvents = 'auto'; }
      if (waitEl) { waitEl.style.display = 'none'; }
    });
    return html;
  },

  playSentence(mi, qi, dayIdx) {
    const m = HOMEWORK_DATA[dayIdx].modules[mi];
    const q = m.questions[qi];
    // Disable options while replaying
    var optsEl = document.getElementById('sp-opts-' + mi);
    var waitEl = document.getElementById('sp-wait-' + mi);
    if (optsEl) { optsEl.style.opacity = '0.4'; optsEl.style.pointerEvents = 'none'; }
    if (waitEl) { waitEl.style.display = 'block'; waitEl.textContent = '⏳ 请先听完整朗读，再选择答案'; }
    this.speak(q.sentence, { onDone: function() {
      if (optsEl) { optsEl.style.opacity = '1'; optsEl.style.pointerEvents = 'auto'; }
      if (waitEl) { waitEl.style.display = 'none'; }
    }});
  },

  selectSpeakAnswer(mi, qi, oi, dayIdx) {
    const m = HOMEWORK_DATA[dayIdx].modules[mi];
    const q = m.questions[qi];
    // Use shuffled answer index
    var shuffled = this._speakingShuffle && this._speakingShuffle[mi + '-' + qi];
    var correctAnswer = shuffled ? shuffled.answer : q.answer;
    var options = shuffled ? shuffled.options : q.options;
    const isCorrect = oi === correctAnswer;
    const selectedText = options[oi];
    this._recordAnswer(dayIdx, mi, qi, selectedText, isCorrect);

    // Disable all options immediately
    const opts = document.querySelectorAll('#sp-opts-' + mi + ' .speak-option');
    opts.forEach((el) => { el.style.pointerEvents = 'none'; });

    // Show "reading answer" indicator
    var waitEl = document.getElementById('sp-wait-' + mi);
    if (waitEl) {
      waitEl.style.display = 'block';
      waitEl.textContent = '正在朗读答句，请认真听…';
      waitEl.style.color = 'var(--primary)';
    }

    // Speak the selected answer, THEN show result
    var self = this;
    this.speak(selectedText, { onDone: function() {
      // Mark correct/wrong
      opts.forEach((el, i) => {
        el.classList.remove('correct', 'wrong');
        if (i === correctAnswer) el.classList.add('correct');
        if (i === oi && !isCorrect) el.classList.add('wrong');
      });
      if (waitEl) waitEl.style.display = 'none';

      // Show pronunciation tip
      const tip = document.getElementById('sp-tip-' + mi);
      tip.classList.add('show');
      tip.innerHTML = '🗣️ <strong>发音提示：</strong>' + q.pronunciation_tips;
      // Show read-aloud section
      const readArea = document.getElementById('sp-read-' + mi);
      if (isCorrect) {
        self._playCorrectSound();
        readArea.innerHTML = '<div class="speak-record show" style="background:var(--success-light)"><p>✅ 回答正确！现在请跟读这句话：</p><button class="speak-btn" onclick="App.startReadAlong(' + mi + ',' + qi + ',\'' + dayIdx + '\')">🎤 开始跟读</button></div>';
      } else {
        self._playWrongSound();
        readArea.innerHTML = '<div class="speak-record show"><p>❌ 回答错误。正确答案：' + options[correctAnswer] + '</p><p class="fs-12 text-sub">请先听朗读，再跟读练习</p><button class="speak-btn" onclick="App.startReadAlong(' + mi + ',' + qi + ',\'' + dayIdx + '\')">🎤 重新跟读</button></div>';
        readArea.innerHTML += '<div class="q-explanation show mt-8"><div class="cn">📖 ' + q.explanation_cn + '</div><div class="en">📘 ' + q.explanation_en + '</div></div>';
      }
    }});
  },

  startReadAlong(mi, qi, dayIdx) {
    Recorder.warmUp();
    const m = HOMEWORK_DATA[dayIdx].modules[mi];
    const q = m.questions[qi];
    const readArea = document.getElementById('sp-read-' + mi);
    var self = this;

    // Capture the audio for real, in parallel with speech recognition.
    this._startClipCapture();
    this._readFinished = false;      // latch, reset per attempt
    // Count attempts per question so 重新跟读 shows as round 2, 3, … for the
    // teacher instead of every record claiming to be the first try.
    this._spRounds = this._spRounds || {};
    const rkey = dayIdx + '-' + mi + '-' + qi;
    this._spRounds[rkey] = (this._spRounds[rkey] || 0) + 1;
    this._spRound = this._spRounds[rkey];

    // Show recording UI immediately with animation
    readArea.innerHTML = '<div class="speak-record show" style="text-align:center">' +
      '<div class="recording-indicator"><div class="rec-mic">🎤</div><div class="rec-pulse"></div></div>' +
      '<p style="font-size:16px;font-weight:600;color:var(--primary);margin:12px 0 4px">正在录音...</p>' +
      '<p class="fs-12 text-sub">请大声朗读下面的句子</p>' +
      '<div class="speak-sentence" style="font-size:18px;margin:12px 0;color:var(--text)">' + q.sentence + '</div>' +
      '<div class="rec-timer" id="rec-timer-' + mi + '">0秒</div>' +
      '<div class="fs-12 text-sub" id="asr-hint-' + mi + '" style="min-height:18px;margin-top:6px"></div>' +
      '<button class="speak-btn" style="background:var(--danger);margin-top:12px" onclick="App._stopReading(' + mi + ',' + qi + ',\'' + dayIdx + '\')">结束朗读</button>' +
      '</div>';

    // Start timer
    var recSeconds = 0;
    var timerInterval = setInterval(function() {
      recSeconds++;
      var timerEl = document.getElementById('rec-timer-' + mi);
      if (timerEl) timerEl.textContent = recSeconds + '秒';
      else clearInterval(timerInterval);
    }, 1000);
    self._recTimerInterval = timerInterval;

    // Recognition is Workers AI only. The browser's SpeechRecognition used to
    // be tried first, but it exists only on Chrome and streams the audio to
    // Google — so the same child got a different recogniser (and a different
    // score) depending on which phone they picked up, and on most of them it
    // failed outright. One path means one behaviour everywhere.

    // Hard cap so a forgotten session cannot record forever.
    clearTimeout(self._readCapTimer);
    self._readCapTimer = setTimeout(function() {
      self._finishRead(mi, qi, dayIdx);
    }, 20000);
  },

  // The single place a read-along ends: child taps 结束朗读, recognition
  // returns, or the 20s cap fires. Whichever happens first wins.
  async _finishRead(mi, qi, dayIdx) {
    if (this._readFinished) return;
    this._readFinished = true;
    clearTimeout(this._readCapTimer);
    if (this._recTimerInterval) { clearInterval(this._recTimerInterval); this._recTimerInterval = null; }

    const m = HOMEWORK_DATA[dayIdx].modules[mi];
    const q = m.questions[qi];
    const readArea = document.getElementById('sp-read-' + mi);

    // Release the mic and get the WAV. Everything below has the audio in hand,
    // so nothing the network does can lose the child's work.
    const blob = await this._finishClipCapture();

    let spoken = null;
    if (blob) {
      if (readArea) {
        readArea.innerHTML = '<div class="speak-record show" style="text-align:center">'
          + '<p style="font-size:15px;color:var(--primary);margin-bottom:6px">正在识别…</p>'
          + '<p class="fs-12 text-sub">正在比对你读的和原句</p></div>';
      }
      const forAsr = (this._spClipSamples && Recorder.padForAsr(this._spClipSamples)) || blob;
      const out = await Api.transcribe(forAsr, null);
      if (out && out.text && !Api.isFillerTranscript(out.text)) spoken = out.text.toLowerCase();
    }

    if (spoken) {
      this._showReadResult(mi, qi, dayIdx, q,
        this.calcPronScore(q.sentence.toLowerCase(), spoken), spoken,
        this.findWrongWords(q.sentence.toLowerCase(), spoken));
    } else {
      this._showSelfAssessment(mi, qi, dayIdx, q,
        blob ? '这次没识别出内容' : '没有录到音频');
    }
  },

  // Stop reading manually (when child clicks "结束朗读")
  _stopReading(mi, qi, dayIdx) {
    this._finishRead(mi, qi, dayIdx);
  },

  // Show speech recognition result
  _showReadResult(mi, qi, dayIdx, q, score, spoken, wrongWords) {
    const m = HOMEWORK_DATA[dayIdx].modules[mi];
    const readArea = document.getElementById('sp-read-' + mi);
    const a = this.alignSpeech(q.sentence, spoken);
    var html = '<div class="speak-record show" style="text-align:center">';
    html += '<div class="speak-score" style="color:' + (score>=70?'var(--success)':'var(--danger)') + '">' + score + '分</div>';
    html += '<div class="fs-12 text-sub mb-8">读对 ' + a.ok + ' / ' + a.total + ' 个词</div>';

    // The sentence, word by word, marked with what happened to each.
    html += '<div class="align-sentence">';
    a.items.forEach(x => {
      if (x.status === 'extra') return;                    // shown separately
      const cls = x.status === 'ok' ? 'w-ok' : x.status === 'wrong' ? 'w-bad' : 'w-miss';
      const tip = x.status === 'wrong' ? ' title="听到的是：' + x.spoken + '"' : '';
      html += '<span class="' + cls + '"' + tip + '>' + x.target + '</span> ';
    });
    html += '</div>';
    html += '<div class="align-key fs-12 text-sub">'
         + '<span class="w-ok">正确</span>'
         + '<span class="w-bad">读错</span>'
         + '<span class="w-miss">漏读</span></div>';

    html += '<div class="fs-12 text-sub mt-8">识别到：' + (spoken || '（没听清）') + '</div>';
    if (a.extra.length) {
      html += '<div class="fs-12 text-sub">多读了：' + a.extra.map(x=>x.spoken).join(' ') + '</div>';
    }
    const practise = a.wrong.map(x => x.target + '（读成了 ' + x.spoken + '）')
                      .concat(a.missing.map(x => x.target + '（漏读）'));
    if (practise.length > 0) {
      html += '<div class="speak-words">需要练习：' + practise.join('、') + '</div>';
    }
    if (score >= 70) {
      html += '<div class="badge badge-success mt-8" style="font-size:14px">✅ 太棒了！通过！</div>';
      this._playCorrectSound();
    } else {
      html += '<div class="badge badge-danger mt-8">分数偏低，再试一次吧</div>';
      this._playWrongSound();
    }
    html += '<div style="display:flex;gap:8px;justify-content:center;margin-top:12px">';
    html += '<button class="speak-btn" onclick="App.startReadAlong(' + mi + ',' + qi + ',\'' + dayIdx + '\')">🎤 重新跟读</button>';
    if (qi < m.questions.length - 1) {
      html += '<button class="speak-btn" style="background:var(--success)" onclick="App.nextSpeaking(' + mi + ',' + (qi+1) + ',\'' + dayIdx + '\')">下一题 →</button>';
    } else {
      html += '<div class="badge badge-success" style="font-size:16px;align-self:center">🎉 全部完成！</div>';
    }
    html += '</div>';
    html += '<div id="sp-clip-' + mi + '" class="mt-8"></div>';
    html += '</div>';
    readArea.innerHTML = html;
    this._persistSpeakingClip(mi, qi, dayIdx, q, score, {
      spoken: spoken, source: 'asr',
      okCount: a.ok, wordTotal: a.total,
      wrongWords: a.wrong.map(x => ({ expected: x.target, heard: x.spoken })),
      missedWords: a.missing.map(x => x.target),
    });
  },

  // Self-assessment mode (when speech recognition is not available)
  _showSelfAssessment(mi, qi, dayIdx, q, reason) {
    const m = HOMEWORK_DATA[dayIdx].modules[mi];
    const readArea = document.getElementById('sp-read-' + mi);
    var self = this;
    var html = '<div class="speak-record show" style="text-align:center">';
    html += '<p style="font-size:15px;font-weight:600;color:var(--primary);margin-bottom:8px">请给自己打分</p>';
    // Be explicit about why the automatic comparison is not shown.
    html += '<p class="fs-12 text-sub mb-8">' + (reason ? reason + '，改为自评。' : '')
         + '听一听标准发音，对比自己的朗读</p>';
    html += '<button class="speak-btn play" style="margin-bottom:12px" onclick="App.speak(\'' + q.sentence.replace(/'/g,"\\'") + '\')">🔊 听标准发音</button>';
    html += '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">';
    html += '<button class="speak-btn" style="background:var(--success)" onclick="App._selfScore(' + mi + ',' + qi + ',\'' + dayIdx + '\',90)">⭐ 很好 (90分)</button>';
    html += '<button class="speak-btn" style="background:var(--warning)" onclick="App._selfScore(' + mi + ',' + qi + ',\'' + dayIdx + '\',75)">👍 还不错 (75分)</button>';
    html += '<button class="speak-btn" style="background:var(--danger)" onclick="App._selfScore(' + mi + ',' + qi + ',\'' + dayIdx + '\',60)">💪 需练习 (60分)</button>';
    html += '</div>';
    html += '</div>';
    readArea.innerHTML = html;
  },

  // Handle self-assessment score
  _selfScore(mi, qi, dayIdx, score) {
    const m = HOMEWORK_DATA[dayIdx].modules[mi];
    const q = m.questions[qi];
    const readArea = document.getElementById('sp-read-' + mi);
    var html = '<div class="speak-record show" style="text-align:center">';
    html += '<div class="speak-score" style="color:' + (score>=70?'var(--success)':'var(--danger)') + '">' + score + '分</div>';
    if (score >= 70) {
      html += '<div class="badge badge-success mt-8" style="font-size:14px">✅ 继续加油！</div>';
      this._playCorrectSound();
    } else {
      html += '<div class="badge badge-warning mt-8">多听多读，你会越来越好！</div>';
    }
    html += '<div style="display:flex;gap:8px;justify-content:center;margin-top:12px">';
    html += '<button class="speak-btn" onclick="App.startReadAlong(' + mi + ',' + qi + ',\'' + dayIdx + '\')">🎤 再读一次</button>';
    if (qi < m.questions.length - 1) {
      html += '<button class="speak-btn" style="background:var(--success)" onclick="App.nextSpeaking(' + mi + ',' + (qi+1) + ',\'' + dayIdx + '\')">下一题 →</button>';
    } else {
      html += '<div class="badge badge-success" style="font-size:16px;align-self:center">🎉 全部完成！</div>';
    }
    html += '</div>';
    html += '<div id="sp-clip-' + mi + '" class="mt-8"></div>';
    html += '</div>';
    readArea.innerHTML = html;
    this._persistSpeakingClip(mi, qi, dayIdx, q, score, { source: 'self' });
  },

  // fallbackPron removed - replaced by _showSelfAssessment for better UX

  nextSpeaking(mi, qi, dayIdx) {
    // In the student's one-question stage each speaking question IS a step —
    // advancing in place would leave the progress counter behind.
    if (!this.isTeacher()) { this.nextStep(); return; }
    const m = HOMEWORK_DATA[dayIdx].modules[mi];
    document.getElementById('sp-content-' + mi).innerHTML = this.renderSpeakingQuestion(m, mi, qi, dayIdx);
  },

  // ===== Speaking: real audio capture =====
  // The read-along UI used to say "正在录音…" while capturing nothing — it
  // only ran speech recognition. Now the audio is actually kept, so the
  // teacher can listen and judge pronunciation themselves.
  _startClipCapture() {
    this._spClip = null;
    this._spClipBlob = null;
    if (!Recorder.supported()) {
      this._spClipStarting = null;
      return Promise.resolve(false);
    }
    // Held so that a finish() arriving before the mic is ready still waits for
    // the recorder — otherwise the clip is lost AND the mic stays open.
    this._spClipStarting = Recorder.start()
      .then(() => { this._spClip = true; return true; })
      .catch(e => {
        // Denied or unavailable: the read-along still works, just without audio.
        console.warn('Clip capture unavailable:', e);
        return false;
      });
    return this._spClipStarting;
  },

  // Idempotent: called as soon as the child stops reading (so the mic is
  // released and we don't record the silence while they self-score), and
  // again when the result is persisted. The blob is buffered in between.
  async _finishClipCapture() {
    if (this._spClipPending) return this._spClipPending;
    // Wait for a capture that is still starting up, so a fast recognition
    // result cannot leave the microphone running.
    if (this._spClipStarting) {
      try { await this._spClipStarting; } catch (e) {}
      this._spClipStarting = null;
    }
    if (!this._spClip) return this._spClipBlob || null;
    this._spClip = null;
    this._spClipPending = Recorder.stop()
      .then(out => {
        this._spClipBlob = out ? out.blob : null;
        this._spClipMeta = out ? { duration: out.duration, sampleRate: out.sampleRate, peak: out.peak } : null;
        this._spClipSamples = out ? out.samples : null;
        this._spClipPending = null;
        return this._spClipBlob;
      })
      .catch(e => { console.warn('Recorder.stop failed:', e); this._spClipPending = null; return null; });
    return this._spClipPending;
  },

  // Persist the clip + score, then drop a player into the result view.
  async _persistSpeakingClip(mi, qi, dayIdx, q, score, extra) {
    const blob = await this._finishClipCapture();
    this._spClipBlob = null;              // consumed; next attempt starts clean
    const meta = Object.assign({
      studentId: this._myStudentId(),
      dayIdx: dayIdx, moduleIdx: mi, itemIdx: qi, round: this._spRound || 1,
      type: 'speaking', label: q.sentence, score: score,
    }, extra || {});

    let clipId = null, url = null;
    if (blob) {
      try {
        const saved = await Api.uploadRecording(blob, meta);
        clipId = saved.id; url = saved.url;
      } catch (e) { console.warn('Speaking clip upload failed:', e); }
    }
    try { await Api.submitSpeakingScore(Object.assign({ clipId }, meta)); }
    catch (e) { console.warn('Speaking score save failed:', e); }

    const slot = document.getElementById('sp-clip-' + mi);
    if (slot) {
      slot.innerHTML = url
        ? '<div class="fs-12 text-sub mb-4">你的朗读</div>'
          + '<audio controls src="' + url + '" style="width:100%;max-width:280px;height:32px"></audio>'
        : '<div class="fs-12 text-sub">本次没有录到音频（可能未授权麦克风）</div>';
    }
  },

  // ===== Speech-recognition comparison =====
  // Word-level alignment between the target sentence and what the recogniser
  // heard. The old version tested `spoken.includes(target)` per word, which
  // matched "think" against "sink" and "in" against "interesting" — it could
  // not tell a mispronunciation from a correct read.
  // Digits are spoken as words: a child reading "10-year-old" says "ten year
  // old", so comparing the written form against the transcript marked a
  // correctly read sentence wrong.
  NUM_WORDS: ['zero','one','two','three','four','five','six','seven','eight',
              'nine','ten','eleven','twelve','thirteen','fourteen','fifteen',
              'sixteen','seventeen','eighteen','nineteen','twenty'],

  _spellNumber(n) {
    const v = parseInt(n, 10);
    if (isNaN(v)) return String(n);
    if (v <= 20) return this.NUM_WORDS[v];
    if (v < 100) {
      const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
      const t = tens[Math.floor(v / 10)], o = v % 10;
      return o ? t + ' ' + this.NUM_WORDS[o] : t;
    }
    return String(v);
  },

  _tokens(s) {
    const self = this;
    return String(s).toLowerCase()
      .replace(/(\d+)/g, function(_, d) { return ' ' + self._spellNumber(d) + ' '; })
      .replace(/[^a-z'\s]/g, ' ')
      .split(/\s+/).filter(Boolean);
  },

  _editDistance(a, b) {
    const n = a.length, m = b.length;
    if (!n) return m;
    if (!m) return n;
    let prev = Array.from({ length: m + 1 }, (_, j) => j);
    for (let i = 1; i <= n; i++) {
      const cur = [i];
      for (let j = 1; j <= m; j++) {
        cur[j] = Math.min(
          prev[j] + 1,
          cur[j - 1] + 1,
          prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
      prev = cur;
    }
    return prev[m];
  },

  // Levenshtein over word arrays, with backtrace, so each target word gets a
  // verdict: ok / wrong (something else was said there) / missing (skipped),
  // plus any extra words that were not in the sentence.
  alignSpeech(target, spoken) {
    const t = this._tokens(target), s = this._tokens(spoken);
    const n = t.length, m = s.length;
    const d = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    const bt = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(''));
    for (let i = 1; i <= n; i++) { d[i][0] = i; bt[i][0] = 'del'; }
    for (let j = 1; j <= m; j++) { d[0][j] = j; bt[0][j] = 'ins'; }
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const same = t[i - 1] === s[j - 1];
        const sub = d[i - 1][j - 1] + (same ? 0 : 1);
        const del = d[i - 1][j] + 1;
        const ins = d[i][j - 1] + 1;
        const best = Math.min(sub, del, ins);
        d[i][j] = best;
        bt[i][j] = best === sub ? (same ? 'match' : 'sub') : (best === del ? 'del' : 'ins');
      }
    }
    const out = [];
    let i = n, j = m;
    while (i > 0 || j > 0) {
      const op = i === 0 ? 'ins' : j === 0 ? 'del' : bt[i][j];
      if (op === 'match' || op === 'sub') {
        out.push({ target: t[i - 1], spoken: s[j - 1], status: op === 'match' ? 'ok' : 'wrong' });
        i--; j--;
      } else if (op === 'del') {
        out.push({ target: t[i - 1], spoken: null, status: 'missing' }); i--;
      } else {
        out.push({ target: null, spoken: s[j - 1], status: 'extra' }); j--;
      }
    }
    out.reverse();
    const total = n || 1;
    const ok = out.filter(x => x.status === 'ok').length;
    return {
      items: out,
      total: n,
      ok: ok,
      score: Math.round(ok / total * 100),
      wrong: out.filter(x => x.status === 'wrong'),
      missing: out.filter(x => x.status === 'missing'),
      extra: out.filter(x => x.status === 'extra'),
    };
  },

  calcPronScore(target, spoken) {
    return this.alignSpeech(target, spoken).score;
  },

  findWrongWords(target, spoken) {
    const a = this.alignSpeech(target, spoken);
    return a.wrong.concat(a.missing).map(x => x.target).filter(w => w && w.length > 1);
  },

  // Old speak() removed - now using new TTS system above

  // Sequentially speak items and highlight corresponding DOM elements
  // items: array of strings to speak
  // prefix: DOM id prefix (e.g., 'letter', 'syllable')
  // mi: module index used in id
  // onDone: callback when all rounds complete
  _speakAndHighlight(items, prefix, mi, onDone) {
    var self = this;
    var idx = 0;
    var round = 0;
    function next() {
      if (round >= 2) { if (onDone) onDone(); return; }
      if (idx >= items.length) { idx = 0; round++; next(); return; }
      var el = document.getElementById(prefix + '-' + mi + '-' + idx);
      if (el) { el.classList.add('active'); el.classList.remove('done'); }
      self.speak(items[idx], { onDone: function() {
        if (el) { el.classList.remove('active'); el.classList.add('done'); }
        idx++;
        setTimeout(next, 500);
      }});
    }
    next();
  },

  // Vocab game (Baicizhan style)
  renderVocabGame(m, mi, dayIdx) {
    this.state.vocabStage = 0;
    this.state.vocabWordIdx = 0;
    this.state.vocabScore = 0;
    this.state.vocabReviewDone = false;
    // Check if previous day has learned words for review
    var reviewWords = this._getLearnedWords(dayIdx - 1);
    if (reviewWords && reviewWords.length > 0) {
      return '<div class="vocab-game" id="vocab-game-' + mi + '">' + this._renderVocabReview(mi, dayIdx, reviewWords, m) + '</div>';
    }
    return '<div class="vocab-game" id="vocab-game-' + mi + '">' + this.renderVocabStage(m, mi, dayIdx) + '</div>';
  },

  // Save learned words for next-day review
  _saveLearnedWords(dayIdx, words) {
    const slim = words.map(function(w) {
      return { word: w.word, meaning: w.meaning, emoji: w.emoji, phonetic: w.phonetic };
    });
    this.state.learnedWords['day_' + dayIdx] = slim;
    // Fire-and-forget: the in-memory copy above is what the renderer reads.
    Api.saveLearnedWords(dayIdx, slim);
  },

  // Get learned words for a specific day. Stays synchronous — it is called
  // from inside a render function that builds HTML in one pass.
  _getLearnedWords(dayIdx) {
    return this.state.learnedWords['day_' + dayIdx] || null;
  },

  // Render review screen
  _renderVocabReview(mi, dayIdx, reviewWords, m) {
    var self = this;
    var html = '<div class="vocab-progress"><div class="fill" style="width:5%"></div></div>';
    html += '<div class="vocab-stage vocab-review">';
    html += '<div class="vr-title">📚 复习昨日单词</div>';
    html += '<div class="vr-sub">先复习昨天学的' + reviewWords.length + '个单词，再学新词</div>';
    reviewWords.forEach(function(w, i) {
      html += '<div class="vr-word-item">';
      html += '<span class="vrw-emoji tap-speak-sm" onclick="App.speak(\'' + w.word.replace(/'/g, "\\'") + '\')" title="点一下听发音">' + (w.emoji || '📖') + '</span>';
      html += '<div class="vrw-info"><div class="vrw-word">' + w.word + '</div><div class="vrw-meaning">' + w.meaning + '</div></div>';
      html += '<button class="vrw-play" onclick="App.speak(\'' + w.word.replace(/'/g, "\\'") + '\')" aria-label="听发音"><svg class="icon icon-sm"><use href="#i-sound"/></svg></button>';
      html += '</div>';
    });
    html += '<button class="vocab-btn" style="margin-top:16px" onclick="App._finishReview(' + mi + ',' + dayIdx + ')">复习完成，开始学新词 →</button>';
    html += '</div>';
    return html;
  },

  // Finish review, start actual vocab game
  _finishReview(mi, dayIdx) {
    this.state.vocabReviewDone = true;
    var m = HOMEWORK_DATA[dayIdx].modules[mi];
    var el = document.getElementById('vocab-game-' + mi);
    if (el) el.innerHTML = this.renderVocabStage(m, mi, dayIdx);
  },

  renderVocabStage(m, mi, dayIdx) {
    const wIdx = this.state.vocabWordIdx;
    const sIdx = this.state.vocabStage;
    if (wIdx >= m.words.length) {
      // Completion screen with score and word list
      var maxScore = m.words.reduce(function(s, w) { return s + w.stages.length; }, 0);
      var scorePct = maxScore > 0 ? Math.round(this.state.vocabScore / maxScore * 100) : 0;
      var stars = scorePct >= 90 ? '⭐⭐⭐' : scorePct >= 70 ? '⭐⭐' : '⭐';
      var html = '<div class="vocab-progress"><div class="fill" style="width:100%"></div></div>';
      html += '<div class="vocab-stage vocab-complete">';
      html += '<div class="vocab-emoji-card" style="background:linear-gradient(135deg,#FFF9E6,#FFE082)">🎉</div>';
      html += '<div class="vc-title">全部学完啦！</div>';
      html += '<div class="vc-stars">' + stars + '</div>';
      html += '<div class="vc-score">答对 ' + this.state.vocabScore + ' / ' + maxScore + ' 题（' + scorePct + '%）</div>';
      html += '<div class="vc-word-list">';
      m.words.forEach(function(w) {
        html += '<div class="vc-word-item"><span class="vcw-emoji tap-speak-sm" onclick="App.speak(\'' + w.word.replace(/'/g, "\\'") + '\')" title="点一下听发音">' + w.emoji + '</span><div class="vcw-info"><div class="vcw-word">' + w.word + '</div><div class="vcw-meaning">' + w.meaning + '</div></div><button class="vrw-play" onclick="App.speak(\'' + w.word.replace(/'/g, "\\'") + '\')" aria-label="听发音"><svg class="icon icon-sm"><use href="#i-sound"/></svg></button></div>';
      });
      html += '</div>';
      html += '<div style="font-size:13px;color:var(--text-sub);margin-top:8px">明天学习新单词时，会先复习这' + m.words.length + '个单词哦</div>';
      html += '</div>';
      // Save completed words for next-day review
      this._saveLearnedWords(dayIdx, m.words);
      return html;
    }
    const word = m.words[wIdx];
    const stage = word.stages[sIdx];
    const totalStages = m.words.length * word.stages.length;
    const currentProgress = (wIdx * word.stages.length + sIdx) / totalStages * 100;

    html = '<div class="vocab-progress"><div class="fill" style="width:' + currentProgress + '%"></div></div>';
    html += '<div class="vocab-stars">' + '⭐'.repeat(Math.min(this.state.vocabScore, 10)) + '</div>';
    html += '<div class="vocab-stage">';

    if (stage.type === 'learn') {
      html += this._wordImage(word, false);
      html += '<div class="vocab-word">' + word.word + '</div>';
      html += '<div class="vocab-phonetic">' + word.phonetic + '</div>';
      html += '<div class="vocab-meaning">' + word.meaning + '</div>';
      html += '<div class="vocab-example">"' + word.example_en + '"<br>' + word.example_cn + '</div>';
      html += '<button class="vocab-btn" onclick="App.speak(\'' + word.word.replace(/'/g,"\\'") + '\')">🔊 听发音</button>';
      html += '<button class="vocab-btn" onclick="App.nextVocabStage(' + mi + ',' + dayIdx + ',' + m.words.length + ',' + word.stages.length + ')">我学会了 →</button>';
      // Auto-read the word
      this.autoSpeak(word.word);
    } else if (stage.type === 'image_choice') {
      html += '<div class="auto-read-badge"><svg class="icon icon-sm speaking-anim"><use href="#i-sound"/></svg> 正在朗读…</div>';
      html += '<div class="vocab-meaning">' + stage.prompt + '</div>';
      html += this._wordImage(word, true);
      html += '<div class="vocab-options" id="vo-' + mi + '" style="opacity:0.4;pointer-events:none">';
      stage.options.forEach((opt, oi) => {
        html += '<div class="vocab-option-card" onclick="App.checkVocabAnswer(' + mi + ',' + oi + ',' + stage.answer + ',' + dayIdx + ',' + m.words.length + ',' + word.stages.length + ')">' + opt + '</div>';
      });
      html += '</div>';
      html += '<div class="listen-wait" id="vw-' + mi + '" style="text-align:center;padding:8px;color:var(--text-sub);font-size:12px">⏳ 请先听完整朗读，再选择答案</div>';
      // Auto-read the word, then enable options
      this.autoSpeak(word.word, function() {
        var el = document.getElementById('vo-' + mi);
        var w = document.getElementById('vw-' + mi);
        if (el) { el.style.opacity = '1'; el.style.pointerEvents = 'auto'; }
        if (w) w.style.display = 'none';
      });
    } else if (stage.type === 'meaning_choice') {
      html += '<div class="auto-read-badge"><svg class="icon icon-sm speaking-anim"><use href="#i-sound"/></svg> 正在朗读…</div>';
      html += this._wordImage(word, true);
      html += '<div class="vocab-word">' + word.word + '</div>';
      html += '<div class="vocab-phonetic">' + word.phonetic + '</div>';
      html += '<div class="vocab-meaning">' + stage.prompt + '</div>';
      html += '<div class="vocab-options" id="vo-' + mi + '" style="opacity:0.4;pointer-events:none">';
      stage.options.forEach((opt, oi) => {
        html += '<div class="vocab-option-card" style="font-size:16px;padding:14px 8px" onclick="App.checkVocabAnswer(' + mi + ',' + oi + ',' + stage.answer + ',' + dayIdx + ',' + m.words.length + ',' + word.stages.length + ')">' + opt + '</div>';
      });
      html += '</div>';
      html += '<div class="listen-wait" id="vw-' + mi + '" style="text-align:center;padding:8px;color:var(--text-sub);font-size:12px">⏳ 请先听完整朗读，再选择答案</div>';
      // Auto-read the word, then enable options
      this.autoSpeak(word.word, function() {
        var el = document.getElementById('vo-' + mi);
        var w = document.getElementById('vw-' + mi);
        if (el) { el.style.opacity = '1'; el.style.pointerEvents = 'auto'; }
        if (w) w.style.display = 'none';
      });
    } else if (stage.type === 'letter_read') {
      html += this._renderSpellRead(m, mi, dayIdx, word,
        word.letters || word.word.split(''), 'letter');
    } else if (stage.type === 'syllable_blend') {
      html += this._renderSpellRead(m, mi, dayIdx, word,
        word.syllables || [word.word], 'syllable');
    } else if (stage.type === 'spell_fill') {
      // Multi-blank support: format like "di__co__r" or "b__autiful"
      var wordWithBlank = stage.prompt.split(': ').pop();
      var parts = wordWithBlank.split('__');
      var blankCount = parts.length - 1;
      // If answer is a single string, split into chars for multi-blank
      var answerChars = stage.answer.split('');
      // Distribute answer chars across blanks
      var blankLengths = [];
      if (blankCount === 1) {
        blankLengths = [answerChars.length];
      } else {
        // Distribute evenly or use explicit lengths if available
        var base = Math.floor(answerChars.length / blankCount);
        var rem = answerChars.length % blankCount;
        for (var bi = 0; bi < blankCount; bi++) {
          blankLengths.push(base + (bi < rem ? 1 : 0));
        }
      }

      var hintText = answerChars.length === 1 ? '缺少一个字母' : '缺少 ' + answerChars.length + ' 个字母';

      html += this._wordImage(word, true);
      html += '<div class="vocab-word">' + word.meaning + '</div>';
      html += '<div class="vocab-meaning">补全拼写</div>';
      html += '<div class="fs-12 text-sub" style="color:var(--primary)">' + hintText + '</div>';
      html += '<div class="spell-inline-container mt-16">';
      var charIdx = 0;
      for (var pi = 0; pi < parts.length; pi++) {
        if (parts[pi]) {
          html += '<span class="spell-letter">' + parts[pi] + '</span>';
        }
        if (pi < parts.length - 1) {
          var bl = blankLengths[pi] || 1;
          html += '<input type="text" class="spell-blank-input" id="vocab-spell-' + mi + '-' + pi + '" maxlength="' + bl + '" size="' + bl + '" placeholder="' + '\u2014'.repeat(bl) + '" autocomplete="off" autocorrect="off" autocapitalize="none" style="width:' + (bl * 28 + 16) + 'px">';
        }
      }
      html += '</div>';
      html += '<div id="spell-result-' + mi + '"></div>';
      html += '<button class="vocab-btn" onclick="App.checkSpell(' + mi + ',\'' + stage.answer.replace(/'/g,"\\'") + '\',' + dayIdx + ',' + m.words.length + ',' + word.stages.length + ',\'' + word.word.replace(/'/g,"\\'") + '\')">确认</button>';
      this._spellFocusId = 'vocab-spell-' + mi + '-0';
    }
    html += '</div>';
    return html;
  },

  checkVocabAnswer(mi, selected, correct, dayIdx, wordCount, stageCount) {
    const opts = document.querySelectorAll('#vocab-game-' + mi + ' .vocab-option-card');

    if (selected === correct) {
      // Correct answer
      opts.forEach((el, i) => {
        el.style.pointerEvents = 'none';
        if (i === correct) el.classList.add('correct');
      });
      this.state.vocabScore++;
      this._playCorrectSound();
      var correctEl = opts[correct];
      if (correctEl) this._showCelebration(correctEl);
      var resultDiv = document.getElementById('spell-result-' + mi) || document.getElementById('vocab-retry-area-' + mi);
      if (resultDiv) resultDiv.innerHTML = '<div style="color:var(--success);font-size:14px;font-weight:600;margin-top:8px">✅ 正确！</div>';
      setTimeout(() => this.nextVocabStage(mi, dayIdx, wordCount, stageCount), 1200);
    } else {
      // Wrong answer - show in orange, highlight correct answer, make it clickable
      opts.forEach((el, i) => {
        el.style.pointerEvents = 'none';
        if (i === selected) el.classList.add('wrong');
        if (i === correct) {
          el.classList.add('correct', 'clickable-correct');
        }
      });
      this._playWrongSound();
      var resultDiv = document.getElementById('spell-result-' + mi) || document.getElementById('vocab-retry-area-' + mi);
      if (!resultDiv) {
        resultDiv = document.createElement('div');
        resultDiv.id = 'vocab-retry-area-' + mi;
        var stageEl = document.getElementById('vocab-game-' + mi);
        if (stageEl) stageEl.appendChild(resultDiv);
      }
      resultDiv.innerHTML = '<div style="color:var(--warning);font-size:13px;margin-top:8px">👉 点亮绿色正确答案，继续学习</div>';
      // Make correct answer clickable to advance
      var correctEl = opts[correct];
      if (correctEl) {
        correctEl.style.pointerEvents = 'auto';
        correctEl.onclick = null;
        correctEl.addEventListener('click', () => {
          this.nextVocabStage(mi, dayIdx, wordCount, stageCount);
        });
      }
    }
  },

  checkSpell(mi, answer, dayIdx, wordCount, stageCount, fullWord) {
    // Collect all spell inputs for this module
    var collected = '';
    var inputEls = [];
    var idx = 0;
    while (true) {
      var inp = document.getElementById('vocab-spell-' + mi + '-' + idx);
      if (!inp) break;
      collected += inp.value.trim().toLowerCase();
      inputEls.push(inp);
      idx++;
    }
    // Fallback to single input if no multi-input found
    if (inputEls.length === 0) {
      var singleInp = document.getElementById('vocab-spell-' + mi);
      if (singleInp) {
        collected = singleInp.value.trim().toLowerCase();
        inputEls.push(singleInp);
      }
    }

    const resultDiv = document.getElementById('spell-result-' + mi);
    if (collected === answer.toLowerCase()) {
      inputEls.forEach(function(el) {
        el.classList.add('correct');
        el.classList.remove('wrong');
        el.disabled = true;
      });
      this.state.vocabScore++;
      this._playCorrectSound();
      if (resultDiv) {
        resultDiv.innerHTML = '<div class="spell-result-word">' + fullWord + '</div><div class="spell-result-phonetic">🔊 ' + fullWord + '</div>';
      }
      this.speak(fullWord);
      setTimeout(() => this.nextVocabStage(mi, dayIdx, wordCount, stageCount), 1500);
    } else {
      inputEls.forEach(function(el) {
        el.classList.add('wrong');
        el.classList.remove('correct');
        el.value = '';
      });
      this._playWrongSound();
      if (resultDiv) {
        var hintText = answer.length === 1 ? '缺少一个字母，请再试一次' : '缺少 ' + answer.length + ' 个字母，请再试一次';
        resultDiv.innerHTML = '<div style="color:var(--danger);font-size:13px;margin-top:8px">❌ ' + hintText + '</div>';
      }
      setTimeout(function() {
        inputEls.forEach(function(el) {
          el.classList.remove('wrong');
        });
        if (inputEls[0]) inputEls[0].focus();
      }, 600);
    }
  },

  nextVocabStage(mi, dayIdx, wordCount, stageCount) {
    const m = HOMEWORK_DATA[dayIdx].modules[mi];
    this.state.vocabStage++;
    if (this.state.vocabStage >= stageCount) {
      this.state.vocabStage = 0;
      this.state.vocabWordIdx++;
    }
    const el = document.getElementById('vocab-game-' + mi);
    if (el) el.innerHTML = this.renderVocabStage(m, mi, dayIdx);
    // Auto-focus spell input if present
    if (this._spellFocusId) {
      var focusId = this._spellFocusId;
      this._spellFocusId = null;
      setTimeout(function() {
        var inp = document.getElementById(focusId);
        if (inp) inp.focus();
      }, 200);
    }
  },

  // ====== Student Voice Recording (Recorder -> 16kHz WAV -> Workers AI) ======
  // NO machine TTS — student records their own voice, system analyzes volume for auto-scoring

  // Start recording a letter — NO machine audio, just microphone
  // Skip to the next word in the vocabulary game; once the words run out,
  // hand over to the stage and move to the next question.
  nextVocabWord(mi, dayIdx) {
    var m = HOMEWORK_DATA[dayIdx] && HOMEWORK_DATA[dayIdx].modules[mi];
    if (!m || !m.words) { this.nextStep(); return; }
    if (this.state.vocabWordIdx >= m.words.length - 1) { this.nextStep(); return; }
    this.state.vocabWordIdx++;
    this.state.vocabStage = 0;
    var el = document.getElementById('vocab-game-' + mi);
    if (el) el.innerHTML = this.renderVocabStage(m, mi, dayIdx);
    this._syncVocabFootLabel(mi, dayIdx);
  },

  // Last word in the game? Then the button really is 下一题.
  _syncVocabFootLabel(mi, dayIdx) {
    var m = HOMEWORK_DATA[dayIdx] && HOMEWORK_DATA[dayIdx].modules[mi];
    var btn = document.getElementById('stage-next-' + mi);
    if (!m || !m.words || !btn) return;
    var last = this.state.vocabWordIdx >= m.words.length - 1;
    btn.textContent = last ? '下一题' : '下一个单词';
  },

  // Every word picture is a play button. Children reach for the picture, not
  // for a separate speaker icon next to it.
  _wordImage(word, big) {
    var w = String(word.word || '').replace(/'/g, "\\'");
    return '<div class="vocab-emoji-card tap-speak"'
         + (big ? ' style="width:100px;height:100px;font-size:52px"' : '')
         + ' onclick="App.speak(\'' + w + '\')" title="点一下听发音"'
         + ' role="button" aria-label="听 ' + w + ' 的发音">'
         + word.emoji + '<span class="tap-speak-badge"><svg class="icon icon-sm"><use href="#i-sound"/></svg></span></div>';
  },

  // Punctuation ends a sentence. Abbreviations would trip this up, but the
  // passages are graded readers — plain sentences, no "Dr." or "e.g.".
  _splitSentences(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .map(function(x) { return x.trim(); })
      .filter(function(x) { return x.length > 1; });
  },

  // Pair each English sentence with its Chinese counterpart — but only when
  // the two really line up. Across the current passages 4 of 5 match; one has
  // 8 English sentences against 7 Chinese, because a translator merged two.
  // Pairing by index there would show the wrong reference answer, which is
  // worse than showing none, so that passage keeps whole-passage translation.
  _pairSentences(m) {
    if (!m || !m.passage || !m.passage_cn) return null;
    const en = this._splitSentences(m.passage);
    const cn = String(m.passage_cn).replace(/\s+/g, '')
      .split(/(?<=[。！？])/).map(function (x) { return x.trim(); })
      .filter(function (x) { return x.length > 1; });
    if (!en.length || en.length !== cn.length) return null;
    return en.map(function (e, i) { return { en: e, cn: cn[i] }; });
  },

  // ===== Reading: translate a sentence aloud =====
  renderTranslateStep(m, mi, si, dayIdx) {
    const pairs = this._pairSentences(m);
    const pair = pairs && pairs[si];
    if (!pair) return '<div class="card text-center text-sub">这篇课文暂不支持逐句翻译</div>';
    Recorder.warmUp();

    let html = '<div class="sent-step">';
    html += '<div class="sent-progress">翻译 ' + (si + 1) + ' / ' + pairs.length + ' 句</div>';
    html += '<div class="sent-text tap-speak-sm" onclick="App.speak(\''
         + pair.en.replace(/'/g, "\\'") + '\')" title="点一下听英文">' + pair.en + '</div>';
    html += '<div class="sent-hint">用中文说出这句话的意思</div>';
    html += '<button class="word-read-btn hold-target" id="trs-btn-' + mi + '-' + si + '"'
         + ' onpointerdown="App._translateSentence(event,' + mi + ',' + si + ')"'
         + ' onpointerup="App._holdEnd(event)" onpointercancel="App._holdEnd(event)"'
         + ' oncontextmenu="return false">按住说中文</button>';
    html += '<div id="trs-status-' + mi + '-' + si + '"></div>';
    html += '<div id="trs-result-' + mi + '-' + si + '"></div>';
    html += '</div>';
    return html;
  },

  _translateSentence(ev, mi, si) {
    const self = this;
    const m = HOMEWORK_DATA[this.state.currentDay].modules[mi];
    const pair = (this._pairSentences(m) || [])[si];
    if (!pair) return;
    const btn = document.getElementById('trs-btn-' + mi + '-' + si);
    const status = document.getElementById('trs-status-' + mi + '-' + si);
    if (btn) btn.classList.add('reading');

    this._holdStart(ev, 'trs-' + mi + '-' + si, '这句的意思', status, function (out, text) {
      if (btn) btn.classList.remove('reading');
      if (!out) return;
      const heard = text ? self._toSimplified(text) : '';
      const r = self.scoreTranslation(pair.cn, heard);

      let html = '<div class="spell-summary">';
      html += '<div class="ss-head"><span class="ss-score">' + (heard ? r.score : '—') + '</span>'
           + '<span class="ss-label">' + (heard ? '意思覆盖 ' + r.covered + '/' + r.total + ' 字'
                                                : '没听清，再说一次') + '</span></div>';
      if (heard) {
        html += '<div class="tr-block"><div class="tr-label">你说的</div>'
             + '<div class="tr-text">' + heard + '</div></div>';
        html += '<div class="tr-block"><div class="tr-label">参考答案</div>'
             + '<div class="tr-text ref">' + pair.cn + '</div></div>';
      }
      if (out.samples) {
        const joined = Recorder.join([out.samples], 0);
        if (joined) html += '<audio controls src="' + URL.createObjectURL(joined.blob)
                         + '" style="width:100%;max-width:280px;height:32px"></audio>';
      }
      html += '</div>';
      const slot = document.getElementById('trs-result-' + mi + '-' + si);
      if (slot) slot.innerHTML = html;
      if (status) status.innerHTML = '';

      const passed = self._gateStep(heard ? r.score : 0, !!heard);
      if (slot && !passed) slot.insertAdjacentHTML('beforeend', self._retryHint(false, !!heard));

      Api.submitSpeakingScore({
        studentId: self._myStudentId(), dayIdx: self.state.currentDay,
        moduleIdx: mi, itemIdx: si, round: 1, type: 'translate-sentence',
        label: pair.en, score: r.score, spoken: heard, source: 'asr',
      });
    });
  },

  // A step is cleared only when the child actually got it. Below the mark
  // they are asked to try again instead of being able to click past it.
  PASS_SCORE: 60,

  _gateStep(score, hasSpeech) {
    const next = document.getElementById('stage-next-btn');
    const passed = !!hasSpeech && score >= this.PASS_SCORE;
    if (next) {
      next.disabled = !passed;
      next.classList.toggle('nudge', passed);
    }
    return passed;
  },

  _retryHint(passed, hasSpeech) {
    if (passed) return '';
    return '<div class="retry-hint">'
         + (hasSpeech ? '没到 ' + this.PASS_SCORE + ' 分，请重试' : '没听清，请重试')
         + '</div>';
  },

  // Steps that must be passed start with the forward button disabled.
  _applyStepLock() {
    if (!this._lockNextOnRender) return;
    this._lockNextOnRender = false;
    const next = document.getElementById('stage-next-btn');
    if (next) { next.disabled = true; next.classList.remove('nudge'); }
  },

  // ===== Reading: one sentence at a time =====
  // Tap the sentence to hear it, hold it to read it back. Deliberately no
  // Chinese here — the child is listening and imitating, not translating.
  renderSentenceStep(m, mi, si, dayIdx) {
    const sents = this._splitSentences(m.passage);
    const sent = sents[si] || '';
    const esc = sent.replace(/'/g, "\\'");
    Recorder.warmUp();

    let html = '<div class="sent-step">';
    html += '<div class="sent-progress">第 ' + (si + 1) + ' / ' + sents.length + ' 句</div>';
    html += '<div class="sent-text tap-speak-sm" id="sent-' + mi + '-' + si + '"'
         + ' onclick="App.speak(\'' + esc + '\')" title="点一下听朗读">' + sent + '</div>';
    html += '<div class="sent-hint">先点句子听一遍，再按住下面的按钮跟读</div>';
    html += '<button class="word-read-btn hold-target" id="sent-btn-' + mi + '-' + si + '"'
         + ' onpointerdown="App._readSentence(event,' + mi + ',' + si + ')"'
         + ' onpointerup="App._holdEnd(event)" onpointercancel="App._holdEnd(event)"'
         + ' oncontextmenu="return false">按住跟读</button>';
    html += '<div id="sent-status-' + mi + '-' + si + '"></div>';
    html += '<div id="sent-result-' + mi + '-' + si + '"></div>';
    html += '</div>';

    // Register the sentence to be spoken; the navigation call speaks it while
    // still inside the tap. iOS Safari only allows playback from within the
    // synchronous call stack of a user gesture — a setTimeout here worked on
    // desktop and silently did nothing on iPhone.
    this._speakOnRender = sent;
    return html;
  },

  _readSentence(ev, mi, si) {
    const self = this;
    const m = HOMEWORK_DATA[this.state.currentDay].modules[mi];
    const sent = this._splitSentences(m.passage)[si] || '';
    const btn = document.getElementById('sent-btn-' + mi + '-' + si);
    const status = document.getElementById('sent-status-' + mi + '-' + si);
    if (btn) btn.classList.add('reading');

    this._holdStart(ev, 'sent-' + mi + '-' + si, '这句话', status, function(out, text) {
      if (btn) btn.classList.remove('reading');
      if (!out) return;
      const a = self.alignSpeech(sent, text || '');
      const slot = document.getElementById('sent-result-' + mi + '-' + si);

      let html = '<div class="spell-summary">';
      html += '<div class="ss-head"><span class="ss-score">' + (text ? a.score : '—') + '</span>'
           + '<span class="ss-label">' + (text ? '读对 ' + a.ok + '/' + a.total + ' 个词' : '没听清，再读一次') + '</span></div>';
      if (text) {
        html += '<div class="align-sentence">';
        a.items.forEach(function(x) {
          if (x.status === 'extra') return;
          const cls = x.status === 'ok' ? 'w-ok' : x.status === 'wrong' ? 'w-bad' : 'w-miss';
          html += '<span class="' + cls + '">' + x.target + '</span> ';
        });
        html += '</div>';
      }
      if (out.samples) {
        const joined = Recorder.join([out.samples], 0);
        if (joined) html += '<audio id="sent-audio-' + mi + '-' + si + '" controls src="'
                         + URL.createObjectURL(joined.blob) + '" style="width:100%;max-width:280px;height:32px"></audio>';
      }
      html += '</div>';
      if (slot) slot.innerHTML = html;
      if (status) status.innerHTML = '';

      const audio = document.getElementById('sent-audio-' + mi + '-' + si);
      if (audio) { const p = audio.play(); if (p && p.catch) p.catch(function(){}); }

      // Passing lights up the forward button; falling short leaves it locked
      // and asks for another go.
      const passed = self._gateStep(text ? a.score : 0, !!text);
      const slotEl = document.getElementById('sent-result-' + mi + '-' + si);
      if (slotEl && !passed) slotEl.insertAdjacentHTML('beforeend', self._retryHint(false, !!text));

      Api.submitSpeakingScore({
        studentId: self._myStudentId(), dayIdx: self.state.currentDay,
        moduleIdx: mi, itemIdx: si, round: 1, type: 'sentence',
        label: sent, score: a.score, spoken: text, source: 'asr',
      });
      Api.uploadRecording(out.blob, {
        studentId: self._myStudentId(), dayIdx: self.state.currentDay,
        moduleIdx: mi, itemIdx: si, round: 1, type: 'sentence',
        label: sent, score: a.score,
      }).catch(function(){});
    });
  },

  // The whole passage, English only, once every sentence has been read.
  renderPassageStep(m, mi, dayIdx) {
    const esc = String(m.passage).replace(/'/g, "\\'");
    Recorder.warmUp();
    let html = '<div class="passage-full">';
    html += '<div class="pf-title">全文</div>';
    html += '<div class="pf-text">' + m.passage + '</div>';
    html += '<div class="pf-actions">';
    html += '<button class="btn-ghost" onclick="App.speak(\'' + esc + '\')">听全文</button>';
    if (m.passage_cn) {
      html += '<button class="word-read-btn" id="tr-btn-' + mi + '" onclick="App.toggleTranslate(' + mi + ')">开始翻译录音</button>';
    }
    html += '</div>';
    html += '<div id="tr-status-' + mi + '"></div>';
    html += '<div id="tr-result-' + mi + '"></div>';
    html += '</div>';
    return html;
  },

  // ===== Translate the passage aloud =====
  // Tap to start, tap to stop — not press-and-hold. Translating a whole
  // passage takes a while and holding a button for a minute is not something
  // to ask of a child.
  async toggleTranslate(mi) {
    const btn = document.getElementById('tr-btn-' + mi);
    const status = document.getElementById('tr-status-' + mi);
    const m = HOMEWORK_DATA[this.state.currentDay].modules[mi];

    if (this._trRecording) {
      this._trRecording = false;
      clearInterval(this._trTimer);
      if (btn) { btn.textContent = '开始翻译录音'; btn.classList.remove('reading'); }
      if (status) status.innerHTML = '<div class="tap-rec"><span class="tap-spin"></span>正在识别…</div>';

      let out = null;
      try { out = await Recorder.stop(); } catch (e) {}
      if (!out || !out.blob) {
        if (status) status.innerHTML = '<div class="tap-result bad">没有录到声音，再试一次</div>';
        return;
      }
      const forAsr = (out.samples && Recorder.padForAsr(out.samples)) || out.blob;
      const res = await Api.transcribe(forAsr, null);
      const heard = res && res.text && !Api.isFillerTranscript(res.text) ? res.text : '';
      const r = this.scoreTranslation(m.passage_cn, heard);

      let html = '<div class="spell-summary">';
      html += '<div class="ss-head"><span class="ss-score">' + (heard ? r.score : '—') + '</span>'
           + '<span class="ss-label">' + (heard ? '意思覆盖 ' + r.covered + '/' + r.total + ' 字' : '没听清，再试一次') + '</span></div>';
      if (heard) {
        html += '<div class="tr-block"><div class="tr-label">你说的</div><div class="tr-text">'
             + this._toSimplified(heard) + '</div></div>';
        html += '<div class="tr-block"><div class="tr-label">参考翻译</div><div class="tr-text ref">'
             + m.passage_cn + '</div></div>';
        html += '<p class="fs-12 text-sub">翻译没有标准答案，这个分数只看意思覆盖了多少，说法不同不代表错。</p>';
      }
      const joined = out.samples ? Recorder.join([out.samples], 0) : null;
      if (joined) html += '<audio controls src="' + URL.createObjectURL(joined.blob)
                       + '" style="width:100%;max-width:280px;height:32px"></audio>';
      html += '</div>';
      const slot = document.getElementById('tr-result-' + mi);
      if (slot) slot.innerHTML = html;
      if (status) status.innerHTML = '';

      Api.submitSpeakingScore({
        studentId: this._myStudentId(), dayIdx: this.state.currentDay,
        moduleIdx: mi, itemIdx: 96, round: 1, type: 'translation',
        label: '整篇翻译', score: r.score, spoken: heard, source: 'asr',
      });
      if (joined) {
        Api.uploadRecording(joined.blob, {
          studentId: this._myStudentId(), dayIdx: this.state.currentDay,
          moduleIdx: mi, itemIdx: 96, round: 1, type: 'translation',
          label: '整篇翻译', score: r.score,
        }).catch(function(){});
      }
      return;
    }

    if (!Recorder.supported()) {
      if (status) status.innerHTML = '<div class="tap-result bad">此浏览器不支持录音</div>';
      return;
    }
    this._trRecording = true;
    if (btn) { btn.textContent = '结束录音'; btn.classList.add('reading'); }
    let secs = 0;
    if (status) status.innerHTML = '<div class="tap-rec"><span class="tap-dot"></span>'
      + '用中文说出这篇文章的意思 <span class="tap-hint" id="tr-time-' + mi + '">0秒</span></div>';
    clearInterval(this._trTimer);
    this._trTimer = setInterval(function() {
      secs++;
      const t = document.getElementById('tr-time-' + mi);
      if (t) t.textContent = secs + '秒';
    }, 1000);

    try { await Recorder.start(); }
    catch (e) {
      this._trRecording = false;
      clearInterval(this._trTimer);
      if (btn) { btn.textContent = '开始翻译录音'; btn.classList.remove('reading'); }
      if (status) status.innerHTML = '<div class="tap-result bad">无法访问麦克风，请允许权限</div>';
    }
  },


  // ===== Chinese translation check =====
  // Whisper transcribes Mandarin in Traditional characters and ignores any
  // language hint (@cf/openai/whisper takes only `audio` — a Simplified
  // prompt was tried and made no difference), so the transcript is folded to
  // Simplified here before it is compared with the reference translation.
  //
  // Coverage is the common everyday set, which is what graded readers use.
  // A character that is not in the table simply stays as it is.
  TRAD: '這來個們時們國學會後間對開實發當經動樣進點種說實過還將產業務員來機關與體現們爾種學裡對後隻歡歡喜聽讀書愛媽爸媽學運動風雲電話語問題長長門馬鳥魚鳥飛車東頭興爾龍龜歲兒兒歲數樓錢銀鐵鋼銅顏線紙筆畫圖書園場農漁牧獵豬雞鴨鵝馬羊狗貓蟲蝦蟹龍鳳凰麗華貴賤買賣價貨財貧富續斷續轉輪車軍陣戰爭勝負將帥兵刀劍槍砲彈藥醫藥療養護衛檢驗診斷術學習慣練習題號碼碼頭條約結約續紹紅綠藍紫綢緞織繡縫繩結網絡線續維綜統緊繼績纖鮮鹽醬醋糖麵飯餅餃麥穀糧倉庫儲藏積蓄豐盈虧損盡歸還償贈賞罰責備懲獎勵勸諫諮詢議論談話語言詞語謠謎謝誠謹謙讓認識記憶讀誦講課試驗證據調查訪問訊詢誤誤譯譯詩詞誌誌湯姆麼沒總聲藝豐辦壓陽陰際隨險難靜華萬與專屬層屆屬島嶺峽帶幫幾廣廳應廠處備複雜賦稟賽獎勵誇讚讓態勢豐績優劣佳績勤懇認眞聰穎穎悟嚴謹積極熱愛興趣趣味關註註意專註堅持毅力鼓勵讚揚驕傲滿意輕鬆愉快興奮激動溫暖親切熱情開朗樂觀積極師傅級課題練習講話語詞說讀寫聽談論述評論斷續識記憶課堂學校教師學生同學朋友夥伴親戚鄰居醫生護士司機農民工人職業',
  SIMP: '这来个们时们国学会后间对开实发当经动样进点种说实过还将产业务员来机关与体现们尔种学里对后只欢欢喜听读书爱妈爸妈学运动风云电话语问题长长门马鸟鱼鸟飞车东头兴尔龙龟岁儿儿岁数楼钱银铁钢铜颜线纸笔画图书园场农渔牧猎猪鸡鸭鹅马羊狗猫虫虾蟹龙凤凰丽华贵贱买卖价货财贫富续断续转轮车军阵战争胜负将帅兵刀剑枪炮弹药医药疗养护卫检验诊断术学习惯练习题号码码头条约结约续绍红绿蓝紫绸缎织绣缝绳结网络线续维综统紧继绩纤鲜盐酱醋糖面饭饼饺麦谷粮仓库储藏积蓄丰盈亏损尽归还偿赠赏罚责备惩奖励劝谏咨询议论谈话语言词语谣谜谢诚谨谦让认识记忆读诵讲课试验证据调查访问讯询误误译译诗词志志汤姆么没总声艺丰办压阳阴际随险难静华万与专属层届属岛岭峡带帮几广厅应厂处备复杂赋禀赛奖励夸赞让态势丰绩优劣佳绩勤恳认真聪颖颖悟严谨积极热爱兴趣趣味关注注意专注坚持毅力鼓励赞扬骄傲满意轻松愉快兴奋激动温暖亲切热情开朗乐观积极师傅级课题练习讲话语词说读写听谈论述评论断续识记忆课堂学校教师学生同学朋友伙伴亲戚邻居医生护士司机农民工人职业',

  _toSimplified(text) {
    if (!this._tsMap) {
      this._tsMap = {};
      for (var i = 0; i < this.TRAD.length && i < this.SIMP.length; i++) {
        if (this.TRAD[i] !== this.SIMP[i]) this._tsMap[this.TRAD[i]] = this.SIMP[i];
      }
    }
    var map = this._tsMap, out = '';
    for (var j = 0; j < text.length; j++) out += map[text[j]] || text[j];
    return out;
  },

  // Meaning, not wording. 「非常有天赋」 and 「很有天赋」 are the same answer,
  // but as character strings they overlap only 3 of 5. Degree adverbs and
  // near-synonyms are folded to one form, and grammatical particles dropped,
  // before anything is compared — otherwise a correct translation phrased
  // differently from the reference is marked down for no good reason.
  ZH_FOLD: {
    // degree
    '非常':'很','十分':'很','特别':'很','格外':'很','相当':'很','挺':'很','极其':'很',
    '极为':'很','异常':'很','尤其':'很','分外':'很','好':'很',
    // frequency / time
    '经常':'常','时常':'常','往往':'常','总是':'常','老是':'常',
    '每日':'每天','天天':'每天','日常':'每天',
    // like / love
    '喜爱':'喜欢','热爱':'喜欢','爱好':'喜欢','钟爱':'喜欢','酷爱':'喜欢',
    // ability
    '天分':'天赋','才能':'天赋','才华':'天赋','资质':'天赋',
    // common nouns
    '男孩子':'男孩','小男孩':'男孩','女孩子':'女孩','小女孩':'女孩',
    '足球运动':'足球','体育运动':'运动','体育':'运动',
    // verbs
    '喜欢做':'喜欢','进行':'','从事':'',
  },
  ZH_DROP: '的了着地得呢吧啊吗呀嘛哦噢欸',

  _zhChars(text) {
    let t = this._toSimplified(String(text || ''));
    // Longest keys first so 「非常」 is folded before 「常」 can match inside it.
    const keys = Object.keys(this.ZH_FOLD).sort((a, b) => b.length - a.length);
    for (const k of keys) t = t.split(k).join(this.ZH_FOLD[k]);
    const drop = this.ZH_DROP;
    return t.replace(/[^\u4e00-\u9fa5]/g, '')
      .split('')
      .filter(c => drop.indexOf(c) < 0);
  },

  // Longest common subsequence over characters. Translation is free-form —
  // two correct translations of the same sentence share content words but not
  // word order or particles — so this measures overlap, not exactness. It is
  // a "did you get the meaning across" indicator, not a translation grade.
  scoreTranslation(reference, spoken) {
    var a = this._zhChars(reference), b = this._zhChars(spoken);
    if (!a.length) return { score: 0, covered: 0, total: 0, spoken: spoken };
    if (!b.length) return { score: 0, covered: 0, total: a.length, spoken: spoken };
    var prev = new Array(b.length + 1).fill(0);
    for (var i = 1; i <= a.length; i++) {
      var cur = [0];
      for (var j = 1; j <= b.length; j++) {
        cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
      }
      prev = cur;
    }
    var lcs = prev[b.length];
    return {
      score: Math.round(lcs / a.length * 100),
      covered: lcs, total: a.length, spoken: spoken,
    };
  },

  // ===== TTS self-test =====
  // Open ?ttstest=1 on the phone. Two guesses have already been shipped
  // blind; this reports which step actually fails on the device that is
  // failing — fetch, decode, or play — for each endpoint and text length.
  async runTtsTest() {
    const WORD = 'beautiful';
    const SENT = 'Tom is a 10-year-old boy from England.';
    const enc = encodeURIComponent;
    const srcs = [
      ['同源 /api/tts', t => '/api/tts?text=' + enc(t)],
      ['有道 dictvoice', t => 'https://dict.youdao.com/dictvoice?audio=' + enc(t) + '&type=2'],
      ['百度 gettts',    t => 'https://fanyi.baidu.com/gettts?lan=en&text=' + enc(t) + '&spd=3&source=web'],
    ];

    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:99999;overflow:auto;padding:16px;font:14px/1.7 -apple-system,sans-serif';
    box.innerHTML = '<h3 style="margin-bottom:8px">语音自检</h3>'
      + '<div id="tt-out">点下面的按钮开始（必须点一下，浏览器才允许播放）</div>'
      + '<button id="tt-go" style="margin-top:14px;padding:12px 22px;border-radius:999px;background:#F07000;color:#fff;font-size:16px">开始测试</button>'
      + '<button id="tt-close" style="margin-left:8px;padding:12px 18px;border-radius:999px;background:#eee">关闭</button>';
    document.body.appendChild(box);
    box.querySelector('#tt-close').onclick = () => box.remove();

    box.querySelector('#tt-go').onclick = async () => {
      const out = box.querySelector('#tt-out');
      const lines = [];
      const say = m => { lines.push(m); out.innerHTML = lines.join('<br>'); };
      say('UA: ' + navigator.userAgent.slice(0, 70));
      say('speechSynthesis: ' + (window.speechSynthesis ? '有' : '无'));

      for (const [name, mk] of srcs) {
        for (const [label, text] of [['单词', WORD], ['句子', SENT]]) {
          const url = mk(text);
          // 1) can the file be fetched at all?
          let fetched = '—';
          try {
            const r = await fetch(url, { method: 'GET' });
            fetched = r.status + ' ' + (r.headers.get('content-type') || '');
          } catch (e) { fetched = '取不到 (' + (e.message || e) + ')'; }

          // 2) will the audio element actually play it?
          const played = await new Promise(resolve => {
            const a = new Audio();
            let done = false;
            const finish = v => { if (!done) { done = true; try { a.pause(); } catch (e) {} resolve(v); } };
            a.onplaying = () => finish('播放成功');
            a.onerror = () => finish('播放失败 code=' + (a.error && a.error.code));
            setTimeout(() => finish('超时未播放'), 6000);
            a.src = url;
            const p = a.play();
            if (p && p.catch) p.catch(e => finish('被拒绝: ' + (e.name || e)));
          });
          say('<b>' + name + ' · ' + label + '</b>：取 ' + fetched + ' ｜ ' + played);
        }
      }
      say('<br>把这一屏截图发给我。');
    };
  },

  // ===== Sound-alike matching =====
  // A syllable read correctly still comes back spelled differently: Whisper
  // wrote "No." for /noʊ/ (know), "Full." for ful, "T" for ti, "shine." for
  // chine. Comparing letters would fail a child who read it perfectly, so both
  // sides are reduced to a rough sound key first.
  _soundKey(w) {
    var x = String(w).toLowerCase().replace(/[^a-z]/g, '');
    if (!x) return '';
    x = x.replace(/^kn/, 'n').replace(/^wr/, 'r').replace(/^gn/, 'n')
         .replace(/^ps/, 's').replace(/^x/, 'z')
         .replace(/dge/g, 'j').replace(/tch/g, 'ch')
         .replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/qu/g, 'kw')
         .replace(/ch/g, 'sh')                 // chine -> shine
         .replace(/gh/g, '')                   // silent
         .replace(/([a-z])\1+/g, '$1');         // full -> ful
    // Silent-final-e and the w/vowel rules only make sense on a real word.
    // Applied to a single letter they erase it — "e" became "" and then
    // matched nothing, so a correctly read E scored as missed.
    if (x.length > 2) {
      x = x.replace(/e$/, '').replace(/([aeiou])w$/, '$1');
    }
    x = x.replace(/([aeiou])\1/g, '$1');
    return x || String(w).toLowerCase().replace(/[^a-z]/g, '');
  },

  // Lenient on purpose: one edit apart still counts. Being strict here means
  // telling a child they read it wrong when the recogniser simply spelled it
  // another way.
  _soundAlike(expected, heard) {
    if (!heard) return false;
    var a = this._soundKey(expected);
    if (!a) return false;
    var toks = String(heard).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
    var self = this;
    return toks.some(function(t) {
      var b = self._soundKey(t);
      if (!b) return false;
      if (a === b) return true;
      if (a.length >= 3 && (a.indexOf(b) === 0 || b.indexOf(a) === 0)) return true;
      return self._editDistance(a, b) <= 1;
    });
  },

  // ===== Spell-then-say =====
  // One implementation for every spelling exercise (letters, syllables, and
  // anything added later): hold each piece to read it, hold the whole word,
  // then hear the takes stitched together.
  //
  // Syllables ARE scored; letters are not. A syllable is a pronounceable
  // chunk the recogniser handles well (know, ledge, ful all came back right,
  // via _soundAlike). An isolated letter is not: E came back as "Capitoli"
  // and W as "www." — scoring those would fail a child who read correctly.
  _renderSpellRead(m, mi, dayIdx, word, units, kind) {
    var self = this;
    Recorder.warmUp();          // so the first hold does not clip the start
    var selfSync = this;
    setTimeout(function(){ selfSync._syncVocabFootLabel(mi, dayIdx); }, 0);
    this._spell = { mi: mi, kind: kind, word: word.word, total: units.length,
                    takes: {}, unitScores: {}, wordTake: null, score: null,
                    units: units.slice(), phase: 'pieces' };

    var html = '<div class="vocab-step-label">' + (kind === 'letter' ? '字母跟读' : '音节拼合') + '</div>';
    html += this._wordImage(word, true);
    html += '<div class="vocab-word">' + word.word + '</div>';
    html += '<div class="vocab-phonetic">' + word.phonetic + '</div>';
    html += '<div class="read-instruction">按住每个格子读，松开结束</div>';

    html += '<div class="spell-row" id="spell-row-' + mi + '">';
    units.forEach(function(u, i) {
      html += '<div class="spell-box hold-target" id="spell-' + mi + '-' + i + '"'
           + ' onpointerdown="App._readUnit(event,' + mi + ',' + i + ')"'
           + ' onpointerup="App._holdEnd(event)" onpointercancel="App._holdEnd(event)"'
           + ' oncontextmenu="return false">'
           + (kind === 'letter' ? String(u).toUpperCase() : u) + '</div>';
    });
    // The whole word is just another box — same shape, on its own line but
    // still sized to the word, not stretched across the row.
    html += '<div class="spell-break"></div>';
    html += '<div class="spell-box spell-word hold-target" id="spell-word-' + mi + '"'
         + ' onpointerdown="App._readFullWord(event,' + mi + ')"'
         + ' onpointerup="App._holdEnd(event)" onpointercancel="App._holdEnd(event)"'
         + ' oncontextmenu="return false">' + word.word + '</div>';
    html += '</div>';

    html += '<div id="spell-status-' + mi + '"></div>';
    html += '<div id="spell-result-area-' + mi + '"></div>';
    html += '<div id="letter-read-btn-' + mi + '" style="display:none;margin-top:12px">';
    html += '<button class="vocab-btn" onclick="App.nextVocabStage(' + mi + ',' + dayIdx + ',' + m.words.length + ',' + word.stages.length + ')">我读好了 →</button>';
    html += '</div>';
    return html;
  },

  _readUnit(ev, mi, idx) {
    var self = this;
    var el = document.getElementById('spell-' + mi + '-' + idx);
    if (!el) return;
    var label = el.textContent.trim();
    var status = document.getElementById('spell-status-' + mi);
    var scored = this._spell.kind === 'syllable';
    el.classList.add('reading');
    this._holdStart(ev, 'unit-' + mi + '-' + idx, label, status, function(out, text) {
      el.classList.remove('reading');
      if (!out) return;
      el.classList.add('read-done');
      if (out.samples) self._spell.takes[idx] = out.samples;   // kept for the joined playback
      self._spell.finished = false;      // a new take must re-run the summary

      // Hear the model right after your own attempt — that comparison is the
      // point of the drill, and it replaces the stitched playback that used
      // to come only at the very end.
      self.speak(label);

      if (!scored) {
        if (status) status.innerHTML = '<div class="tap-result good">已读「' + label + '」</div>';
      } else {
        var ok = self._soundAlike(label, text);
        self._spell.unitScores[idx] = { label: label, ok: ok, heard: text };
        el.classList.toggle('read-miss', !ok);
        if (status) {
          status.innerHTML = '<div class="tap-result ' + (ok ? 'good' : 'bad') + '">'
            + (ok ? '读对了：' + label : '再读一次「' + label + '」')
            + (text ? '<span class="tap-heard">识别：' + text + '</span>'
                    : '<span class="tap-heard">没识别出内容</span>') + '</div>';
        }
        Api.submitSpeakingScore({
          studentId: self._myStudentId(), dayIdx: self.state.currentDay,
          moduleIdx: mi, itemIdx: idx, round: 1, type: 'syllable',
          label: label, score: ok ? 100 : 0, spoken: text, source: 'asr',
        });
      }
      self._spellProgress(mi);
    }, scored);
  },

  async _readFullWord(ev, mi) {
    var self = this;
    var el = document.getElementById('spell-word-' + mi);
    var status = document.getElementById('spell-status-' + mi);
    var wordText = this._spell.word;
    if (el) el.classList.add('reading');
    this._holdStart(ev, 'word-' + mi, wordText, status, async function(out, text) {
      if (el) el.classList.remove('reading');
      if (!out) return;
      if (el) el.classList.add('read-done');
      self.speak(wordText);
      self._spell.finished = false;      // re-reading must re-score and redraw
      var a = self.alignSpeech(wordText, text || '');
      self._spell.wordTake = out.samples || null;
      self._spell.score = a.score;
      self._spell.heard = text;
      if (status) {
        status.innerHTML = '<div class="tap-result ' + (a.score >= 60 ? 'good' : 'bad') + '">'
          + '整词 ' + a.score + ' 分'
          + (text ? '<span class="tap-heard">识别：' + text + '</span>'
                  : '<span class="tap-heard">没识别出内容</span>') + '</div>';
      }
      Api.submitSpeakingScore({
        studentId: self._myStudentId(), dayIdx: self.state.currentDay,
        moduleIdx: mi, itemIdx: 99, round: 1, type: 'word',
        label: wordText, score: a.score, spoken: text, source: 'asr',
      });
      self._spellProgress(mi);
    });
  },

  // Nothing advances on its own — the child decides when to finish.
  _spellProgress(mi) {
    var sp = this._spell;
    var done = Object.keys(sp.takes).length;
    var area = document.getElementById('spell-result-area-' + mi);
    if (!area) return;
    if (done >= sp.total && sp.wordTake) {
      // Everything is read — play the stitched take back and show the score
      // straight away. Only moving on to the NEXT exercise waits for a tap.
      if (!sp.finished) { sp.finished = true; this._finishSpell(mi); }
      return;
    } else {
      area.innerHTML = '<div class="fs-12 text-sub">已读 ' + done + '/' + sp.total
        + (sp.wordTake ? '，整词已读' : '，整词未读') + '</div>';
    }
  },

  // Stitch every take into one clip so the child hears the pieces then the
  // whole word in sequence, and show the word score.
  // Phase A summary. Deliberately compact: it has to fit the fixed stage
  // height without scrolling, so scores go in a grid rather than one row per
  // letter, and there is no audio player here — the recording belongs to
  // phase B, where the whole thing is read in one breath.
  _finishSpell(mi) {
    var sp = this._spell;
    var area = document.getElementById('spell-result-area-' + mi);
    if (!area) return;

    var cells = '';
    for (var i = 0; i < sp.total; i++) {
      var u = sp.unitScores[i];
      var lbl = (u && u.label) || (sp.units && sp.units[i]) || '·';
      if (sp.kind === 'letter') lbl = String(lbl).toUpperCase();
      var state = !u ? 'na' : (u.ok === undefined ? 'done' : (u.ok ? 'ok' : 'bad'));
      cells += '<span class="sc-cell ' + state + '">' + lbl + '</span>';
    }
    var noSpeech = !sp.heard;

    var html = '<div class="spell-summary">';
    html += '<div class="ss-head"><span class="ss-score">'
         + (noSpeech || sp.score === null ? '—' : sp.score) + '</span>'
         + '<span class="ss-label">' + (noSpeech ? '整词没听清' : '整词得分') + '</span></div>';
    html += '<div class="sc-grid">' + cells + '</div>';
    html += '<button class="word-read-btn" onclick="App.startContinuous(' + mi + ')">连续读一遍 →</button>';
    html += '</div>';
    area.innerHTML = html;
    this._playCelebrate();
    this._syncVocabFootLabel(mi, this.state.currentDay);
  },

  // ===== Phase B: read the whole thing in one take =====
  // One hold, letters then the word, straight through. This is the take that
  // gets recorded, played back and scored — the phase A drill is for hearing
  // each piece against the model.
  startContinuous(mi) {
    var sp = this._spell;
    if (!sp) return;
    sp.phase = 'continuous';
    var seq = (sp.units || []).map(function(u) {
      return sp.kind === 'letter' ? String(u).toUpperCase() : u;
    }).concat([sp.word]);
    var area = document.getElementById('spell-result-area-' + mi);
    var row = document.getElementById('spell-row-' + mi);
    if (row) row.style.display = 'none';
    var instr = document.querySelector('.read-instruction');
    if (instr) instr.textContent = '按住不放，把下面的字母和单词连着读一遍';

    var html = '<div class="cont-seq">' + seq.map(function(x, i) {
      return '<span class="cont-item" id="cont-' + mi + '-' + i + '">' + x + '</span>';
    }).join('') + '</div>';
    html += '<button class="word-read-btn hold-target" id="cont-btn-' + mi + '"'
         + ' onpointerdown="App._readContinuous(event,' + mi + ')"'
         + ' onpointerup="App._holdEnd(event)" onpointercancel="App._holdEnd(event)"'
         + ' oncontextmenu="return false">按住连续读</button>';
    html += '<div id="cont-status-' + mi + '"></div>';
    html += '<div id="cont-result-' + mi + '"></div>';
    if (area) area.innerHTML = html;
  },

  _readContinuous(ev, mi) {
    var self = this;
    var sp = this._spell;
    var btn = document.getElementById('cont-btn-' + mi);
    var status = document.getElementById('cont-status-' + mi);
    var seq = (sp.units || []).concat([sp.word]);
    if (btn) btn.classList.add('reading');

    this._holdStart(ev, 'cont-' + mi, sp.word, status, function(out, text) {
      if (btn) btn.classList.remove('reading');
      if (!out) return;
      var res = self._scoreSequence(seq, text);
      sp.contScore = res.score;
      sp.contHeard = text;

      // Mark which pieces were actually heard.
      seq.forEach(function(x, i) {
        var el = document.getElementById('cont-' + mi + '-' + i);
        if (el) el.className = 'cont-item ' + (res.hits[i] ? 'ok' : 'miss');
      });

      var joined = out.samples ? Recorder.join([out.samples], 0) : null;
      var html = '<div class="spell-summary">';
      html += '<div class="ss-head"><span class="ss-score">'
           + (text ? res.score : '—') + '</span><span class="ss-label">'
           + (text ? '连续读得分 · 读到 ' + res.ok + '/' + seq.length : '没听清，再读一次') + '</span></div>';
      if (joined) {
        html += '<audio id="cont-audio-' + mi + '" controls src="' + URL.createObjectURL(joined.blob)
             + '" style="width:100%;max-width:280px;height:32px"></audio>';
      }
      html += '<div class="ss-actions">';
      html += '<button class="btn-ghost" onclick="App.startContinuous(' + mi + ')">再读一次</button>';
      html += '</div></div>';
      var slot = document.getElementById('cont-result-' + mi);
      if (slot) slot.innerHTML = html;
      if (status) status.innerHTML = '';

      var audio = document.getElementById('cont-audio-' + mi);
      if (audio) { var p = audio.play(); if (p && p.catch) p.catch(function(){}); }

      Api.uploadRecording(out.blob, {
        studentId: self._myStudentId(), dayIdx: self.state.currentDay,
        moduleIdx: mi, itemIdx: 97, round: 1, type: 'continuous',
        label: sp.word, score: res.score, spoken: text,
      }).catch(function(){});
      Api.submitSpeakingScore({
        studentId: self._myStudentId(), dayIdx: self.state.currentDay,
        moduleIdx: mi, itemIdx: 97, round: 1, type: 'continuous',
        label: sp.word, score: res.score, spoken: text, source: 'asr',
      });
      self._syncVocabFootLabel(mi, self.state.currentDay);
    });
  },

  // How much of the expected sequence turned up, in order. Each expected item
  // is matched by sound, not spelling — the recogniser writes "No." for know
  // and "T" for ti.
  _scoreSequence(expected, transcript) {
    var hits = new Array(expected.length).fill(false);
    if (!transcript) return { score: 0, ok: 0, hits: hits };
    var toks = String(transcript).toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
                 .split(/\s+/).filter(Boolean);
    var cursor = 0, ok = 0;
    for (var i = 0; i < expected.length; i++) {
      for (var j = cursor; j < toks.length; j++) {
        if (this._soundAlike(expected[i], toks[j])) {
          hits[i] = true; ok++; cursor = j + 1; break;
        }
      }
    }
    return { score: Math.round(ok / expected.length * 100), ok: ok, hits: hits };
  },


  // ===== Press and hold to record =====
  // Hold to speak, release to stop — the gesture from a voice message. Pointer
  // events (not mouse/touch pairs) so one code path covers finger, pen and
  // mouse, and setPointerCapture so releasing outside the button still ends
  // the recording instead of leaving the mic open.
  _holdStart(ev, key, promptLabel, statusEl, onDone, needsTranscript) {
    if (ev) {
      ev.preventDefault();
      if (ev.pointerId !== undefined && ev.currentTarget.setPointerCapture) {
        try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
      }
    }
    if (this._holdKey) return;                 // already recording something
    var self = this;
    this._holdKey = key;
    this._holdDone = onDone;
    this._holdNeedsTranscript = needsTranscript !== false;
    this._holdStatusEl = statusEl;
    this._holdStartedAt = Date.now();

    var setStatus = function(html) { if (statusEl) statusEl.innerHTML = html; };
    setStatus('<div class="tap-rec"><span class="tap-dot"></span>正在录「' + promptLabel + '」'
            + '<span class="tap-hint">松开结束</span>'
            + '<div class="rec-wave"><div class="rec-wave-bar" id="tap-wave" style="width:0%"></div></div></div>');

    if (!Recorder.supported()) {
      setStatus('<div class="tap-result bad">此浏览器不支持录音</div>');
      this._holdKey = null;
      return;
    }

    Recorder.start({
      onLevel: function(v) {
        var bar = document.getElementById('tap-wave');
        if (bar) bar.style.width = Math.min(100, Math.round(v * 140)) + '%';
      }
    }).catch(function() {
      setStatus('<div class="tap-result bad">无法访问麦克风，请允许权限</div>');
      self._holdKey = null;
    });

    clearTimeout(this._holdCap);
    this._holdCap = setTimeout(function() { self._holdEnd(); }, 15000);
  },

  async _holdEnd(ev) {
    if (ev) ev.preventDefault();
    var key = this._holdKey, onDone = this._holdDone, statusEl = this._holdStatusEl;
    var needs = this._holdNeedsTranscript;
    var heldMs = Date.now() - (this._holdStartedAt || 0);
    this._holdKey = null; this._holdDone = null;
    clearTimeout(this._holdCap);
    if (!key) return;

    // A stray tap is not an attempt — drop it rather than scoring silence.
    if (heldMs < 220) {
      try { await Recorder.stop(); } catch (e) {}
      if (statusEl) statusEl.innerHTML = '<div class="tap-result bad">按住不放才能录音</div>';
      return;
    }

    if (statusEl && needs) statusEl.innerHTML = '<div class="tap-rec"><span class="tap-spin"></span>正在识别…</div>';
    var out = null;
    try { out = await Recorder.stop(); } catch (e) { console.warn('hold stop failed', e); }
    if (!out || !out.blob) {
      if (statusEl) statusEl.innerHTML = '<div class="tap-result bad">没有录到声音，再按住试一次</div>';
      if (onDone) onDone(null, null);
      return;
    }
    // Pieces of a word are practice, not a test — no upload, no recognition.
    if (!needs) { if (onDone) onDone(out, null); return; }
    // Send the padded copy — short clips make Whisper hallucinate.
    var forAsr = (out.samples && Recorder.padForAsr(out.samples)) || out.blob;
    var res = await Api.transcribe(forAsr, null);
    var text = res && res.text ? res.text : null;
    if (Api.isFillerTranscript(text)) text = null;
    if (onDone) onDone(out, text);
  },

  // Writing template
  renderWritingTemplate(m, mi, dayIdx) {
    let html = '<div class="writing-template">';
    html += '<div class="writing-banner">⚠️ ' + m.requirement_cn + '</div>';
    html += '<div class="writing-keywords">';
    m.keywords.forEach(k => html += '<span class="keyword-chip">' + k + '</span>');
    html += '</div>';
    html += '<div class="card mb-16"><div class="card-title fs-12">📝 完成作文（填入空白处）</div>';
    html += '<div class="writing-essay">';
    let text = m.template;
    m.blanks.forEach(b => {
      text = text.replace('{{' + b.id + '}}', '<input type="text" class="writing-blank-input" data-blank="' + b.id + '" data-answer="' + b.answer + '" placeholder="' + b.hint_cn + '" style="border:none;border-bottom:2px solid var(--primary);text-align:center;color:var(--primary);font-weight:600;width:120px;background:transparent;font-size:14px">');
    });
    html += text;
    html += '</div></div>';
    html += '<button class="btn btn-primary" onclick="App.submitWriting(' + mi + ',' + dayIdx + ')">提交批改</button>';
    html += '<div id="writing-result-' + mi + '"></div>';
    html += '</div>';
    return html;
  },

  submitWriting(mi, dayIdx) {
    const m = HOMEWORK_DATA[dayIdx].modules[mi];
    const inputs = document.querySelectorAll('[data-blank]');
    let correct = 0, total = m.blanks.length;
    let detail = '';
    m.blanks.forEach((b, bi) => {
      const input = document.querySelector('[data-blank="' + b.id + '"]');
      const val = input.value.trim().toLowerCase();
      const ans = b.answer.toLowerCase();
      const isCorrect = val === ans;
      this._recordAnswer(dayIdx, mi, bi, val, isCorrect);
      if (isCorrect) correct++;
      detail += '<div class="fs-12 mb-8"><span class="badge ' + (isCorrect?'badge-success':'badge-danger') + '">' + (isCorrect?'✅':'❌') + '</span> 空白' + b.id + '：你填 "' + (input.value||'(空)') + '" | 正确：' + b.answer + '</div>';
      if (isCorrect) { input.style.color = 'var(--success)'; input.style.borderColor = 'var(--success)'; }
      else { input.style.color = 'var(--danger)'; input.style.borderColor = 'var(--danger)'; }
    });
    const score = Math.round(correct / total * 100);
    const result = document.getElementById('writing-result-' + mi);
    result.innerHTML = '<div class="card mt-16" style="background:var(--primary-light)"><div class="card-title">📊 批改结果</div><div class="text-center mb-16"><span style="font-size:36px;font-weight:700;color:' + (score>=80?'var(--success)':score>=60?'var(--warning)':'var(--danger)') + '">' + score + '</span><span class="text-sub">分/100</span></div>' + detail + '<div class="q-explanation show mt-8"><div class="cn">📖 ' + (m.explanation_cn||'') + '</div><div class="en">📘 ' + (m.explanation_en||'') + '</div></div><div class="card mt-16" style="background:var(--success-light)"><div class="card-title fs-12">✅ 完整范文</div><div class="mt-8">' + m.full_text + '</div></div><div class="writing-banner mt-16">📝 请背诵这篇作文！明天将进行挖空默写测试</div></div>';
  },

  // ===== One question per screen =====
  // Flattens the day into a linear list of steps. Modules with their own
  // internal progression (vocab game, writing template) stay one step each;
  // everything else contributes one step per question.
  _buildSteps(dayIdx) {
    const day = HOMEWORK_DATA[dayIdx];
    const steps = [];
    if (!day || !day.modules) return steps;
    day.modules.forEach((m, mi) => {
      if (m.type === 'vocabulary_game')       { steps.push({ mi, kind: 'vocab' }); return; }
      if (m.type === 'writing_template')      { steps.push({ mi, kind: 'writing' }); return; }
      if (m.type === 'speaking' && m.questions) {
        m.questions.forEach((q, qi) => steps.push({ mi, qi, kind: 'speaking' }));
        return;
      }
      // A passage is read aloud sentence by sentence first — listen, then read
      // it back — and only after the whole text does the child answer on it.
      if (m.passage) {
        this._splitSentences(m.passage).forEach((sent, si) =>
          steps.push({ mi, si, kind: 'sentence' }));
        const pairs = this._pairSentences(m);
        if (pairs) {
          // Read it sentence by sentence, then translate it sentence by
          // sentence. No full-text screen in between.
          pairs.forEach((pr, si) => steps.push({ mi, si, kind: 'translate' }));
        } else {
          // Falls back to the whole-passage screen only where the English and
          // Chinese sentences do not line up, so that passage still gets a
          // translation exercise rather than none at all.
          steps.push({ mi, kind: 'passage' });
        }
      }
      if (m.questions) m.questions.forEach((q, qi) => steps.push({ mi, qi, kind: 'question' }));
    });
    return steps;
  },

  // Advance after the child has seen the feedback. Debounced so a module
  // that records several answers at once (writing) still advances once.
  _scheduleAdvance(delay) {
    if (this.isTeacher()) return;
    clearTimeout(this._advanceTimer);
    this._advanceTimer = setTimeout(() => this.nextStep(), delay || 1400);
  },

  // Speak whatever the freshly rendered step registered, still inside the tap
  // that triggered it. If audio has not been unlocked yet, park it for the
  // first tap instead of losing it.
  _flushSpeakOnRender() {
    this._applyStepLock();
    var sent = this._speakOnRender;
    this._speakOnRender = null;
    if (!sent) return;
    if (this._ttsUnlocked) this.speak(sent);
    else this._pendingSpeak = sent;
  },

  nextStep() {
    clearTimeout(this._advanceTimer);
    this._stopCurrentAudio();
    const steps = this._buildSteps(this.state.currentDay);
    if (this.state.stepIdx < steps.length - 1) {
      this.state.stepIdx++;
      this.renderContent();
      this._flushSpeakOnRender();
    } else {
      this.state.stepIdx = steps.length;   // -> completion screen
      this.renderContent();
    }
  },

  prevStep() {
    clearTimeout(this._advanceTimer);
    this._stopCurrentAudio();
    if (this.state.stepIdx > 0) { this.state.stepIdx--; this.renderContent(); this._flushSpeakOnRender(); }
  },

  goToStep(i) {
    clearTimeout(this._advanceTimer);
    this._stopCurrentAudio();
    this.state.stepIdx = i;
    this.renderContent();
    this._flushSpeakOnRender();
  },

  // The fixed, non-scrolling stage. Only the passage box scrolls internally
  // so a long reading text stays reachable without the page moving.
  renderStage(dayIdx) {
    const day = HOMEWORK_DATA[dayIdx];
    const steps = this._buildSteps(dayIdx);
    if (steps.length === 0) return '<div class="card text-center text-sub">今天没有作业</div>';

    if (this.state.stepIdx >= steps.length) {
      const sid = this._myStudentId();
      const ck = this.state.checkins[Api.checkinKey(sid, dayIdx)];
      let done = '<div class="stage"><div class="stage-done">';
      done += '<svg class="icon icon-xl"><use href="#i-check"/></svg>';
      done += '<div class="sd-title">今天的作业做完了</div>';
      if (ck) done += '<div class="sd-sub">答对 ' + (ck.answered - ck.wrongCount) + ' / ' + ck.answered + ' 题 · 正确率 ' + ck.correctRate + '%</div>';
      done += '<button class="btn-primary-lg" onclick="App.goToStep(0)">再看一遍</button>';
      done += '</div></div>';
      return done;
    }

    const step = steps[this.state.stepIdx];
    const m = day.modules[step.mi];

    let html = '<div class="stage">';

    // Head: module name + progress
    html += '<div class="stage-head">';
    html += '<span class="sh-name">' + m.name_cn + '</span>';
    html += '<div class="stage-progress"><i style="width:' + Math.round((this.state.stepIdx) / steps.length * 100) + '%"></i></div>';
    html += '<span class="sh-count">' + (this.state.stepIdx + 1) + ' / ' + steps.length + '</span>';
    html += '</div>';

    html += '<div class="stage-body">';
    // No "开启语音" gate. Browsers unlock audio on the first user gesture and
    // the child's first action here IS a tap — the banner was a screen to get
    // past, nothing more.
    if (!this.state.audioEnabled) this.state.audioEnabled = true;

    if (step.kind === 'sentence') {
      html += this.renderSentenceStep(m, step.mi, step.si, dayIdx);
      this._lockNextOnRender = true;
    } else if (step.kind === 'passage') {
      html += this.renderPassageStep(m, step.mi, dayIdx);
    } else if (step.kind === 'translate') {
      html += this.renderTranslateStep(m, step.mi, step.si, dayIdx);
      this._lockNextOnRender = true;
    } else if (step.kind === 'question') {
      // English only — the child has already read this passage aloud.
      if (m.passage) {
        html += '<div class="stage-passage"><div class="fs-12 text-sub mb-4">阅读材料</div>'
             + '<p>' + m.passage + '</p></div>';
      }
      if (m.audio_text) {
        html += '<div class="mb-8"><button class="btn btn-outline btn-sm" onclick="App.speak(\'' + m.audio_text.replace(/'/g,"\\'") + '\')">听录音</button></div>';
      }
      html += '<div class="stage-q">' + this._renderOneQuestion(m, step.mi, step.qi, dayIdx) + '</div>';
      const self = this;
      setTimeout(function(){ self._autoSpeakQuestion(m, step.mi, step.qi, dayIdx); }, 250);
    } else if (step.kind === 'speaking') {
      html += '<div class="stage-q" id="sp-content-' + step.mi + '">'
           + this.renderSpeakingQuestion(m, step.mi, step.qi, dayIdx) + '</div>';
    } else if (step.kind === 'vocab') {
      html += '<div class="stage-q">' + this.renderVocabGame(m, step.mi, dayIdx) + '</div>';
    } else if (step.kind === 'writing') {
      html += '<div class="stage-q stage-scroll">' + this.renderWritingTemplate(m, step.mi, dayIdx) + '</div>';
    }
    html += '</div>';

    // Foot: going back is always allowed. On the vocabulary step the forward
    // button walks the words INSIDE the game — a single global 下一题 there
    // skipped the whole game in one stray tap. Only after the last word does
    // it move on to the next question.
    html += '<div class="stage-foot">';
    html += '<button class="btn-ghost" onclick="App.prevStep()"' + (this.state.stepIdx === 0 ? ' disabled' : '') + '>上一题</button>';
    if (step.kind === 'vocab') {
      html += '<button class="btn-ghost" id="stage-next-' + step.mi + '" onclick="App.nextVocabWord(' + step.mi + ',' + dayIdx + ')">下一个单词</button>';
    } else {
      // Name the button after what actually comes next: reading a passage is
      // a run of sentences, not a run of questions.
      var nextStep = steps[this.state.stepIdx + 1];
      var label;
      if (this.state.stepIdx === steps.length - 1) label = '完成';
      else if (step.kind === 'sentence')
        label = nextStep && nextStep.kind === 'sentence' ? '下一句'
              : nextStep && nextStep.kind === 'translate' ? '开始翻译'
              : nextStep && nextStep.kind === 'passage' ? '整篇翻译' : '下一题';
      else if (step.kind === 'translate') label = nextStep && nextStep.kind === 'translate' ? '下一句' : '开始做题';
      else if (step.kind === 'passage') label = '开始做题';
      else label = '下一题';
      html += '<button class="btn-ghost" id="stage-next-btn" onclick="App.nextStep()">' + label + '</button>';
    }
    html += '</div>';

    html += '</div>';
    return html;
  },

  // Questions (reading, grammar, etc.)
  renderQuestionsStudent(m, mi, dayIdx) {
    let html = '';
    // Audio enable check
    if (!this.state.audioEnabled) {
      html += '<div class="audio-enable-banner">';
      html += '<div class="ae-icon">🔊</div>';
      html += '<div class="ae-title">点击开启语音朗读</div>';
      html += '<div class="ae-desc">开启后，每道题会自动用纯正美音朗读英语</div>';
      html += '<button class="ae-btn" onclick="App.enableAudio()">🔊 开启语音</button>';
      html += '</div>';
      return html;
    }
    if (m.passage) {
      html += '<div class="card mb-16" style="background:var(--bg)"><div class="fs-12 text-sub mb-4">📄 阅读材料：</div>' + (m.passage_cn||'') + '<br><br>' + m.passage + '</div>';
    }
    if (m.audio_text) {
      html += '<div class="card mb-16" style="background:var(--info-light)"><button class="speak-btn play" onclick="App.speak(\'' + m.audio_text.replace(/'/g,"\\'") + '\')">🔊 听录音</button>';
      html += '</div>';
    }
    m.questions.forEach((q, qi) => {
      html += this._renderOneQuestion(m, mi, qi, dayIdx);
    });

    // After rendering, auto-play audio_text first, then first question
    // This avoids the forEach race condition where all speak() calls cancel each other
    var self = this;
    setTimeout(function() {
      if (m.audio_text && self.state.audioEnabled) {
        // Play audio_text first, then first question
        self.speak(m.audio_text, { onDone: function() {
          self._autoSpeakQuestion(m, mi, 0, dayIdx);
        }});
      } else if (m.questions && m.questions.length > 0) {
        // No audio_text, just play first question
        self._autoSpeakQuestion(m, mi, 0, dayIdx);
      }
    }, 300);

    return html;
  },

  // One question's markup. Extracted so both the scrolling list (teacher
  // preview) and the one-question-per-screen stage render identical DOM —
  // the ids the answer handlers manipulate stay the same either way.
  _renderOneQuestion(m, mi, qi, dayIdx) {
    const q = m.questions[qi];
    var qId = 'q-' + mi + '-' + qi;
    let html = '<div class="q-item" id="' + qId + '">';
    html += '<div class="q-num">第' + (qi+1) + '题</div>';
    // Add listen button if the question has audio content
    // (audio_text like listening questions, OR English question text)
    var qHasAudio = !!(q.audio_text || (q.question && /[a-zA-Z]/.test(q.question)));
    if (qHasAudio) {
      html += '<div class="auto-read-badge" id="arb-' + mi + '-' + qi + '"><svg class="icon icon-sm speaking-anim"><use href="#i-sound"/></svg> 正在朗读…</div>';
      html += '<div class="flex gap-8 mb-8"><button class="btn btn-outline btn-sm" onclick="App.replayQuestion(\'' + qId + '\',' + mi + ',' + qi + ',\'' + dayIdx + '\')"><svg class="icon icon-sm"><use href="#i-sound"/></svg> 重新听</button></div>';
    }
    html += '<div class="q-text">' + q.question + '</div>';
    if (q.options) {
      // Options disabled until reading finishes
      html += '<div class="q-options" id="qo-' + mi + '-' + qi + '" style="opacity:0.4;pointer-events:none">';
      q.options.forEach((o, oi) => {
        html += '<div class="q-option" onclick="App.selectAnswer(' + mi + ',' + qi + ',' + oi + ',' + dayIdx + ')">' + String.fromCharCode(65+oi) + '. ' + o + '</div>';
      });
      html += '</div>';
      html += '<div class="listen-wait" id="qw-' + mi + '-' + qi + '" style="text-align:center;padding:8px;color:var(--text-sub);font-size:12px">⏳ 请先听完整朗读，再选择答案</div>';
    } else {
      html += '<input type="text" class="vocab-input" style="width:100%;letter-spacing:1px;border:1.5px solid #FFE0CC;margin-top:8px" id="fill-' + mi + '-' + qi + '" placeholder="填入答案" onkeyup="if(event.key===\'Enter\')App.submitFill(' + mi + ',' + qi + ',' + dayIdx + ')">';
      html += '<button class="btn btn-primary btn-sm mt-8" onclick="App.submitFill(' + mi + ',' + qi + ',' + dayIdx + ')">确认</button>';
    }
    html += '<div class="q-answer" id="ans-' + mi + '-' + qi + '" style="display:none"></div>';
    html += '<div class="q-explanation" id="exp-' + mi + '-' + qi + '"><div class="cn">' + (q.explanation_cn||'') + '</div><div class="en">' + (q.explanation_en||'') + '</div>';
    // Correction area (only shows after wrong answer)
    html += '<div class="card mt-8" style="background:var(--warning-light);display:none" id="correct-area-' + mi + '-' + qi + '"><div class="fs-12 mb-4">请手写改正（输入你的改正答案）：</div><textarea rows="2" style="width:100%;border:1.5px solid #FFE0CC;border-radius:8px;padding:8px" placeholder="在此写出你的改正答案..."></textarea></div>';
    html += '</div>';
    html += '</div>';
    return html;
  },

  // Auto-speak a specific question and enable its options when done
  _autoSpeakQuestion(m, mi, qi, dayIdx) {
    var q = m.questions[qi];
    var qHasAudio = !!(q && (q.audio_text || (q.question && /[a-zA-Z]/.test(q.question))));
    if (!q || !qHasAudio) {
      // No audio content, just enable options
      var optsEl = document.getElementById('qo-' + mi + '-' + qi);
      var waitEl = document.getElementById('qw-' + mi + '-' + qi);
      if (optsEl) { optsEl.style.opacity = '1'; optsEl.style.pointerEvents = 'auto'; }
      if (waitEl) waitEl.style.display = 'none';
      return;
    }
    // Listening questions: play the audio_text (the actual listening content).
    // Regular questions: play the English question text.
    this.autoSpeak(q.audio_text || q.question, function() {
      var optsEl = document.getElementById('qo-' + mi + '-' + qi);
      var waitEl = document.getElementById('qw-' + mi + '-' + qi);
      if (optsEl) { optsEl.style.opacity = '1'; optsEl.style.pointerEvents = 'auto'; }
      if (waitEl) waitEl.style.display = 'none';
    });
  },

  replayQuestion(qId, mi, qi, dayIdx) {
    const m = HOMEWORK_DATA[dayIdx].modules[mi];
    const q = m.questions[qi];
    // Disable options while replaying
    var optsEl = document.getElementById('qo-' + mi + '-' + qi);
    var waitEl = document.getElementById('qw-' + mi + '-' + qi);
    if (optsEl) { optsEl.style.opacity = '0.4'; optsEl.style.pointerEvents = 'none'; }
    if (waitEl) { waitEl.style.display = 'block'; }
    // Listening questions replay the audio_text; others replay the question text
    this.speak(q.audio_text || q.question, { onDone: function() {
      if (optsEl) { optsEl.style.opacity = '1'; optsEl.style.pointerEvents = 'auto'; }
      if (waitEl) waitEl.style.display = 'none';
    }});
  },

  selectAnswer(mi, qi, oi, dayIdx) {
    const m = HOMEWORK_DATA[dayIdx].modules[mi];
    const q = m.questions[qi];
    const isCorrect = oi === q.answer;
    this._recordAnswer(dayIdx, mi, qi, oi, isCorrect);
    const opts = document.querySelectorAll('#q-' + mi + '-' + qi + ' .q-option');
    opts.forEach((el, i) => {
      el.classList.remove('correct', 'wrong', 'selected');
      el.style.pointerEvents = 'none';
      if (i === q.answer) el.classList.add('correct');
      if (i === oi && !isCorrect) el.classList.add('wrong');
    });
    const ansEl = document.getElementById('ans-' + mi + '-' + qi);
    ansEl.style.display = 'block';
    ansEl.innerHTML = isCorrect ? '✅ 正确！' : '❌ 错误。正确答案：' + String.fromCharCode(65+q.answer);
    if (isCorrect) {
      this._playCorrectSound();
    } else {
      this._playWrongSound();
      document.getElementById('exp-' + mi + '-' + qi).classList.add('show');
      document.getElementById('correct-area-' + mi + '-' + qi).style.display = 'block';
    }
    // Auto-speak the next question after a short delay.
    // Only in the teacher's scrolling list, where the next question is already
    // on screen. In the student's one-question stage the next question is not
    // shown yet, so reading it here would speak ahead of the transition —
    // the stage speaks the question itself when it mounts.
    if (this.isTeacher() && qi < m.questions.length - 1) {
      var self = this;
      setTimeout(function() {
        self._autoSpeakQuestion(m, mi, qi + 1, dayIdx);
      }, isCorrect ? 1500 : 2500);
    }
  },

  submitFill(mi, qi, dayIdx) {
    const m = HOMEWORK_DATA[dayIdx].modules[mi];
    const q = m.questions[qi];
    const input = document.getElementById('fill-' + mi + '-' + qi);
    const val = input.value.trim().toLowerCase();
    const ans = String(q.answer).toLowerCase();
    const isCorrect = val === ans;
    this._recordAnswer(dayIdx, mi, qi, val, isCorrect);
    const ansEl = document.getElementById('ans-' + mi + '-' + qi);
    ansEl.style.display = 'block';
    if (isCorrect) {
      ansEl.innerHTML = '✅ 正确！';
      input.style.borderColor = 'var(--success)';
      input.style.color = 'var(--success)';
      document.getElementById('correct-area-' + mi + '-' + qi).style.display = 'none';
      this._playCorrectSound();
    } else {
      ansEl.innerHTML = '❌ 错误。正确答案：' + q.answer;
      input.style.borderColor = 'var(--danger)';
      input.style.color = 'var(--danger)';
      document.getElementById('exp-' + mi + '-' + qi).classList.add('show');
      document.getElementById('correct-area-' + mi + '-' + qi).style.display = 'block';
      this._playWrongSound();
    }
    // Auto-speak the next question after a short delay.
    // Only in the teacher's scrolling list, where the next question is already
    // on screen. In the student's one-question stage the next question is not
    // shown yet, so reading it here would speak ahead of the transition —
    // the stage speaks the question itself when it mounts.
    if (this.isTeacher() && qi < m.questions.length - 1) {
      var self = this;
      setTimeout(function() {
        self._autoSpeakQuestion(m, mi, qi + 1, dayIdx);
      }, isCorrect ? 1500 : 2500);
    }
  },

  // ===== Student/Parent: My Errors =====
  renderMyErrors() {
    let html = '<h2 style="color:var(--primary-dark);margin-bottom:12px">❌ 我的错题本</h2>';
    // The questions this child actually got wrong. Was a random 40% of every
    // question in the week, reshuffled on each render.
    const sid = this._myStudentId();
    const errors = [];
    HOMEWORK_DATA.forEach((day, di) => {
      day.modules.forEach((m, mi) => {
        if (m.questions) {
          m.questions.forEach((q, qi) => {
            const a = this.state.answers[Api.answerKey(sid, di, mi, qi)];
            if (a && !a.correct) {
              errors.push({ day: day.day_cn, module: m.name_cn, q: q, dayIdx: di });
            }
          });
        }
      });
    });
    if (errors.length === 0) {
      html += '<div class="card text-center text-sub">暂无错题，继续加油！</div>';
    } else {
      errors.forEach((e, i) => {
        html += '<div class="error-item">';
        html += '<div class="e-q"><strong>' + e.day + '·' + e.module + '</strong> ' + (e.q.question || e.q.sentence) + '</div>';
        html += '<div class="q-answer">正确答案：' + (e.q.options ? String.fromCharCode(65+e.q.answer) : e.q.answer) + '</div>';
        html += '<div class="q-explanation show"><div class="cn">📖 ' + (e.q.explanation_cn||'') + '</div><div class="en">📘 ' + (e.q.explanation_en||'') + '</div></div>';
        html += '<button class="btn btn-outline btn-sm mt-8" onclick="App.practiceSimilar(' + i + ')">🔄 做相似题</button>';
        html += '<div id="similar-' + i + '"></div>';
        html += '</div>';
      });
    }
    return html;
  },

  practiceSimilar(idx) {
    const similar = {
      question: 'Choose the correct answer: She ___ to school every day.',
      options: ['go', 'goes', 'going', 'went'],
      answer: 1,
      explanation_cn: '第三人称单数 She + 一般现在时 → goes。注意 every day 是一般现在时标志词。',
      explanation_en: 'Third person singular She + simple present tense → goes. Every day is a present tense marker.'
    };
    let html = '<div class="card mt-8" style="background:var(--warning-light)"><div class="card-title fs-12">🔄 相似练习题</div>';
    html += '<div class="q-text">' + similar.question + '</div>';
    html += '<div class="q-options">';
    similar.options.forEach((o, oi) => {
      html += '<div class="q-option" onclick="this.parentElement.querySelectorAll(\'.q-option\').forEach((el,i)=>{if(i===' + similar.answer + ')el.classList.add(\'correct\');if(i===' + oi + '&&i!==' + similar.answer + ')el.classList.add(\'wrong\')})">' + String.fromCharCode(65+oi) + '. ' + o + '</div>';
    });
    html += '</div>';
    html += '<div class="q-explanation show"><div class="cn">📖 ' + similar.explanation_cn + '</div><div class="en">📘 ' + similar.explanation_en + '</div></div>';
    html += '</div>';
    document.getElementById('similar-' + idx).innerHTML = html;
  },

  // ===== Non-teacher: My Child Progress =====
  renderMyProgress() {
    const myName = this.state.userName;
    const myClass = this.state.className;
    // Identify by phone, not by name+class. The teacher can rename a student
    // and the cloud merge overwrites the local name, both of which broke the
    // old name match — and the fallback minted a fresh 's'+Date.now() id on
    // every render, so this student's check-ins could never be found.
    let myStudent = this.state.students.find(s => s.phone === this.state.phone);
    if (!myStudent) {
      myStudent = { id: this._myStudentId(), name: myName, phone: this.state.phone, parentPhone: this.state.phone, class: myClass };
    }
    let html = '<h2 style="color:var(--primary-dark);margin-bottom:12px">📊 ' + myName + ' 的打卡情况</h2>';
    html += '<div class="card mb-16" style="background:var(--primary-light);border:none">';
    html += '<div class="flex-between"><span>👤 ' + myName + '</span><span class="badge badge-primary">' + myClass + '</span></div>';
    html += '</div>';

    // Summary stats
    let doneCount = 0, totalCorrect = 0, correctCount = 0;
    HOMEWORK_DATA.forEach((d, di) => {
      const k = myStudent.id + '_d' + di;
      const ck = this.state.checkins[k];
      if (ck && ck.done) {
        doneCount++;
        if (ck.correctRate) { totalCorrect += ck.correctRate; correctCount++; }
      }
    });
    html += '<div class="stat-row mb-16">';
    html += '<div class="stat-box"><div class="num" style="color:var(--success)">' + doneCount + '</div><div class="label">已完成天数</div></div>';
    html += '<div class="stat-box"><div class="num" style="color:var(--danger)">' + (HOMEWORK_DATA.length - doneCount) + '</div><div class="label">未完成天数</div></div>';
    html += '<div class="stat-box"><div class="num">' + (correctCount > 0 ? Math.round(totalCorrect/correctCount) : 0) + '%</div><div class="label">平均正确率</div></div>';
    html += '</div>';

    // Daily detail table
    html += '<div class="card"><table class="data-table"><thead><tr><th>日期</th><th>类型</th><th>打卡状态</th><th>完成时间</th><th>正确率</th><th>错题数</th></tr></thead><tbody>';
    HOMEWORK_DATA.forEach((d, di) => {
      const k = myStudent.id + '_d' + di;
      const ck = this.state.checkins[k];
      html += '<tr><td>' + d.day_cn + '（' + this.getDayDateLabel(di, 0) + '）' + (this.isDayToday(di, 0) ? ' 📍今天' : '') + '</td>';
      html += '<td>' + (d.is_speaking_day ? 'AI口语日' : '练习日') + '</td>';
      if (ck) {
        html += '<td><span class="badge ' + (ck.done ? 'badge-success">已打卡' : 'badge-warning">进行中') + '</span></td>';
        html += '<td>' + (ck.time||'-') + '</td>';
        html += '<td><span class="badge ' + (ck.correctRate>=85?'badge-success':ck.correctRate>=60?'badge-warning':'badge-danger') + '">' + (ck.correctRate||0) + '%</span></td>';
        html += '<td>' + (ck.wrongCount||0) + '</td>';
      } else {
        html += '<td><span class="badge badge-danger">未打卡</span></td>';
        html += '<td>-</td><td>-</td><td>-</td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  },

  // ===== Non-teacher: Class Comparison =====
  renderCompare() {
    const myClass = this.state.className;
    let html = '<h2 style="color:var(--primary-dark);margin-bottom:12px">🏆 全班完成率对比</h2>';
    html += '<div class="card mb-16" style="background:var(--primary-light);border:none">';
    html += '<div class="flex-between"><span>🏫 ' + myClass + '</span><span class="badge badge-primary">' + this.state.students.filter(s => s.class === myClass).length + '人</span></div>';
    html += '</div>';

    // Build rankings
    const classStudents = this.state.students.filter(s => s.class === myClass);
    const rankings = classStudents.map(s => {
      let doneCount = 0, totalCorrect = 0, correctCount = 0, firstTime = '';
      HOMEWORK_DATA.forEach((d, di) => {
        const k = s.id + '_d' + di;
        const ck = this.state.checkins[k];
        if (ck && ck.done) {
          doneCount++;
          if (ck.correctRate) { totalCorrect += ck.correctRate; correctCount++; }
          if (di === 0 && ck.time) firstTime = ck.time;
        }
      });
      return { name: s.name, doneCount, avgCorrect: correctCount > 0 ? Math.round(totalCorrect/correctCount) : 0, firstTime, isMe: s.name === this.state.userName };
    });
    rankings.sort((a, b) => b.doneCount - a.doneCount || b.avgCorrect - a.avgCorrect);

    // Ranking table
    html += '<div class="card">';
    html += '<table class="data-table"><thead><tr><th>排名</th><th>姓名</th><th>完成天数</th><th>平均正确率</th></tr></thead><tbody>';
    rankings.forEach((r, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1);
      const highlight = r.isMe ? ' style="background:var(--primary-light)"' : '';
      html += '<tr' + highlight + '><td>' + medal + '</td><td>' + r.name + (r.isMe ? ' <span class="badge badge-primary">我</span>' : '') + '</td>';
      html += '<td>' + r.doneCount + '/' + HOMEWORK_DATA.length + '</td>';
      html += '<td><span class="badge ' + (r.avgCorrect>=85?'badge-success':r.avgCorrect>=70?'badge-primary':'badge-warning') + '">' + r.avgCorrect + '%</span></td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    // Daily check-in status for all
    html += '<h3 class="mt-16" style="color:var(--primary-dark)">📅 每日打卡状态</h3>';
    html += '<div class="card"><div class="checkin-table"><table class="data-table"><thead><tr><th>姓名</th>';
    HOMEWORK_DATA.forEach((d, di) => html += '<th>' + d.day_cn + '<br><span style="font-weight:400;font-size:10px;color:var(--text-sub,#888)">' + this.getDayDateLabel(di, 0) + '</span></th>');
    html += '<th>完成率</th></tr></thead><tbody>';
    rankings.forEach(r => {
      const student = classStudents.find(s => s.name === r.name);
      const highlight = r.isMe ? ' style="background:var(--primary-light)"' : '';
      html += '<tr' + highlight + '><td>' + r.name + (r.isMe ? ' ⭐' : '') + '</td>';
      let doneCount = 0;
      HOMEWORK_DATA.forEach((d, di) => {
        const k = student.id + '_d' + di;
        const ck = this.state.checkins[k];
        if (ck) {
          if (ck.done) doneCount++;
          html += '<td><span class="checkin-dot ' + (ck.completed==='partial'?'partial':'done') + '" title="' + ck.time + '">✓</span></td>';
        } else {
          html += '<td><span class="checkin-dot undone">✗</span></td>';
        }
      });
      html += '<td>' + Math.round(doneCount/HOMEWORK_DATA.length*100) + '%</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
  },

  // ===== Invite =====
  showInvite() {
    const link = window.location.href + '?invite=1';
    this.showModal(`
      <div class="modal-header"><div class="modal-title">🔗 邀请加入班级</div><button class="modal-close" onclick="App.closeModal()">&times;</button></div>
      <div class="modal-body invite-content">
        <div class="qr-placeholder"><img src="photo.jpeg?v=51" alt="Amy老师英语打卡" style="width:100%;height:100%;object-fit:cover;border-radius:8px"></div>
        <p class="text-sub fs-12">扫码或分享链接加入</p>
        <div class="invite-link">${link}</div>
        <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${link}');alert('链接已复制')">📋 复制链接</button>
        <ul class="invite-rules">
          <li>1. 点击链接进入平台</li>
          <li>2. 输入手机号注册登录</li>
          <li>3. 按格式填写备注名：中文名-英文名（如：马慧-Amy）</li>
          <li>4. 等待老师审核并分配班级</li>
        </ul>
      </div>
    `);
  },

  // ===== Modal =====
  showModal(html) {
    document.getElementById('modal-box').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.remove('show');
  },
};

// Init
App.init();

// Preload voices (some browsers need this)
if (window.speechSynthesis) {
  // Trigger voice loading
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = function() {
    if (App && App.state) {
      App.state.voices = window.speechSynthesis.getVoices();
    }
  };
  // Retry loading voices
  setTimeout(function() { window.speechSynthesis.getVoices(); }, 500);
  setTimeout(function() { window.speechSynthesis.getVoices(); }, 1500);
}
