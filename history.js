export const HISTORY_VERSION = 1;
export const BACKUP_FORMAT = 'timecue-history';

export function localDateKey(date = new Date()) {
  return [String(date.getFullYear()).padStart(4, '0'), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function validDateKey(value) {
  if (typeof value !== 'string' || !/^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T12:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function totals(sets) {
  return sets.reduce((sum, set) => {
    sum.sets++;
    if (set.type === 'time') sum.seconds += set.seconds;
    else sum.reps += set.reps;
    return sum;
  }, { sets: 0, seconds: 0, reps: 0 });
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}
const whole = value => Number.isSafeInteger(value) && value >= 0;
const timestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

// Validate and copy only known fields; totals always come from the set details.
export function validateRecord(record) {
  requireValue(record && record.version === HISTORY_VERSION, 'Unsupported session format version.');
  requireValue(typeof record.id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(record.id), 'Invalid session ID.');
  requireValue(typeof record.name === 'string' && record.name.trim().length > 0 && record.name.length <= 80, 'Invalid session name.');
  requireValue(validDateKey(record.date), 'Invalid calendar date.');
  requireValue(timestamp(record.startedAt) && timestamp(record.savedAt), 'Invalid session timestamps.');
  requireValue(typeof record.timeZone === 'string' && record.timeZone.length > 0 && record.timeZone.length <= 100, 'Invalid time zone.');
  try { new Intl.DateTimeFormat('en', { timeZone: record.timeZone }); } catch { throw new Error('Invalid time zone.'); }
  requireValue(Array.isArray(record.sets) && record.sets.length > 0, 'A session must contain at least one set.');
  const ids = new Set();
  const sets = record.sets.map(set => {
    requireValue(set && whole(set.id) && set.id > 0 && !ids.has(set.id), 'Invalid or duplicate set ID.');
    ids.add(set.id);
    requireValue(['time', 'reps'].includes(set.type), 'Invalid set type.');
    requireValue(whole(set.seconds) && whole(set.measuredSeconds) && set.seconds <= set.measuredSeconds, 'Invalid set duration.');
    requireValue(set.type === 'time' ? set.seconds > 0 : whole(set.reps) && set.reps > 0, 'Invalid set result.');
    requireValue(set.restSeconds === null || whole(set.restSeconds), 'Invalid rest interval.');
    return { id: set.id, type: set.type, seconds: set.seconds, measuredSeconds: set.measuredSeconds, reps: set.type === 'reps' ? set.reps : null, restSeconds: set.restSeconds };
  });
  const sum = totals(sets);
  requireValue(whole(sum.seconds) && whole(sum.reps), 'Session totals are too large.');
  return { version: HISTORY_VERSION, id: record.id, name: record.name, date: record.date, startedAt: record.startedAt, savedAt: record.savedAt, timeZone: record.timeZone, sets };
}

export function createRecord(session, { id, date, timeZone, savedAt = new Date().toISOString() }) {
  requireValue(session.state === 'finished', 'Finish the session before saving it to the calendar.');
  return validateRecord({ version: HISTORY_VERSION, id, date, timeZone, savedAt, name: session.name, startedAt: session.createdAt.toISOString(), sets: session.sets });
}

export function parseBackup(text) {
  let backup;
  try { backup = JSON.parse(text); } catch { throw new Error('Choose a valid TimeCue JSON backup.'); }
  requireValue(backup?.format === BACKUP_FORMAT && backup.version === HISTORY_VERSION, 'Unsupported backup format or version.');
  requireValue(timestamp(backup.exportedAt), 'Invalid backup timestamp.');
  requireValue(Array.isArray(backup.sessions), 'Invalid session list.');
  const records = backup.sessions.map(validateRecord);
  requireValue(new Set(records.map(record => record.id)).size === records.length, 'The backup contains duplicate session IDs.');
  return records;
}

export function serializeBackup(records) {
  return JSON.stringify({ format: BACKUP_FORMAT, version: HISTORY_VERSION, exportedAt: new Date().toISOString(), sessions: records.map(validateRecord) }, null, 2);
}

export class HistoryStore {
  constructor({ indexedDB, name = 'timecue-history' } = {}) {
    try { this.factory = indexedDB ?? globalThis.indexedDB; } catch { this.factory = null; }
    this.name = name;
    this.connection = null;
  }

  open() {
    if (!this.connection) {
      this.connection = new Promise((resolve, reject) => {
        if (!this.factory) { reject(new Error('Calendar storage is unavailable in this browser.')); return; }
        let rejected = false;
        const request = this.factory.open(this.name, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
        };
        request.onerror = () => reject(new Error('Could not open calendar storage. Check your browser storage settings.'));
        request.onblocked = () => {
          rejected = true;
          reject(new Error('Close other TimeCue tabs, then retry opening the calendar.'));
        };
        request.onsuccess = () => {
          const db = request.result;
          if (rejected) { db.close(); return; }
          db.onversionchange = () => { db.close(); this.connection = null; };
          resolve(db);
        };
      }).catch(error => { this.connection = null; throw error; });
    }
    return this.connection;
  }

  async transaction(mode, action) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(new Error('Calendar storage could not complete the operation. Nothing was saved. Check available storage and retry.'));
      try { action(tx.objectStore('sessions'), value => { result = value; }); }
      catch (error) { tx.abort(); reject(error); }
    });
  }

  list() {
    return this.transaction('readonly', (store, done) => {
      store.getAll().onsuccess = event => done(event.target.result);
    });
  }

  save(record) {
    const copy = validateRecord(record);
    return this.transaction('readwrite', store => store.put(copy));
  }

  remove(id) {
    return this.transaction('readwrite', store => store.delete(id));
  }

  importRecords(records) {
    const copies = records.map(validateRecord);
    requireValue(new Set(copies.map(record => record.id)).size === copies.length, 'Duplicate session IDs.');
    // One transaction makes import all-or-nothing, including quota failures.
    return this.transaction('readwrite', (store, done) => {
      store.getAllKeys().onsuccess = event => {
        const existing = new Set(event.target.result);
        let added = 0;
        for (const record of copies) {
          if (!existing.has(record.id)) { store.add(record); added++; }
        }
        done({ added, skipped: copies.length - added });
      };
    });
  }
}
