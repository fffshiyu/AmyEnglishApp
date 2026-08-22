/* eslint-disable */
// Cloud sync using textdb.dev (free, CORS enabled, works in China).
// Two fixed keys are used: PRIMARY and BACKUP. Every save writes to both;
// reads prefer PRIMARY and fall back to BACKUP. Keys are deterministic,
// so all devices share the same storage — no per-device blob forking.
const Cloud = {
  DB_URL: 'https://textdb.dev/api/data/amy-eng-1fb05e57eb5c6d6b',
  DB_URL_BACKUP: 'https://textdb.dev/api/data/amy-eng-bk-803bdfd024b45483',

  lastError: null,     // set when the last operation failed (for UI display)
  lastSyncAt: null,    // ISO time of last successful save

  init() {
    // Intentionally empty — storage keys are fixed above.
    // (Old versions overrode the URL from localStorage, which caused
    //  devices to fork onto different blobs and silently stop syncing.)
  },

  isConfigured() {
    return true;
  },

  async _fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    if (!text || text === 'null' || !text.trim()) return null;
    try { return JSON.parse(text); } catch(e) { return null; }
  },

  // Load all data from cloud (primary first, then backup)
  async loadAll() {
    this.lastError = null;
    try {
      const data = await this._fetchJson(this.DB_URL);
      return data;
    } catch(e1) {
      try {
        const data = await this._fetchJson(this.DB_URL_BACKUP);
        this.lastError = '主存储不可达，已用备份';
        return data;
      } catch(e2) {
        this.lastError = '网络连接失败';
        console.warn('Cloud loadAll error:', e1, e2);
        return null;
      }
    }
  },

  // Save all data to cloud — writes to BOTH keys for redundancy
  async saveAll(data) {
    this.lastError = null;
    const body = JSON.stringify(data);
    const doPut = (url) => fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: body
    }).then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); });

    try {
      await doPut(this.DB_URL);
      this.lastSyncAt = new Date().toISOString();
      // Backup write is best-effort; failure of backup alone is OK
      try { await doPut(this.DB_URL_BACKUP); } catch(eb) { console.warn('Backup save failed:', eb); }
      return true;
    } catch(e1) {
      // Primary failed — try backup alone
      try {
        await doPut(this.DB_URL_BACKUP);
        this.lastSyncAt = new Date().toISOString();
        this.lastError = '主存储不可达，已写入备份';
        return true;
      } catch(e2) {
        this.lastError = '保存失败：' + (e2.message || '网络错误');
        console.warn('Cloud saveAll error:', e1, e2);
        return false;
      }
    }
  },
};
