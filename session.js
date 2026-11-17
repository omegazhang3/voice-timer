// Session records are intentionally held in memory only.
export function validSetDuration(seconds) {
  return Number.isSafeInteger(seconds) && seconds > 0;
}

export function validReps(reps) {
  return Number.isSafeInteger(reps) && reps > 0;
}

export class Session {
  constructor({ now = () => new Date() } = {}) {
    this.now = now;
    this.state = 'empty';
    this.name = '';
    this.createdAt = null;
    this.sets = [];
    this.pending = null;
    this.nextId = 1;
    this.revision = 0;
  }

  create(name = '') {
    if (this.state === 'active') return false;
    this.createdAt = this.now();
    this.name = name.trim().slice(0, 80) || 'Session · ' + this.createdAt.toLocaleString();
    this.sets = [];
    this.pending = null;
    this.nextId = 1;
    this.state = 'active';
    this.revision++;
    return true;
  }

  record(seconds, type = 'time') {
    if (this.state !== 'active' || this.pending || !['time', 'reps'].includes(type)) return false;
    if (!Number.isSafeInteger(seconds) || seconds < 0 || (type === 'time' && seconds === 0)) return false;
    this.pending = { id: this.nextId++, type, seconds, measuredSeconds: seconds, reps: null, restSeconds: null };
    this.revision++;
    return true;
  }

  updatePending(seconds) {
    if (this.state !== 'active' || this.pending?.type !== 'time' || !validSetDuration(seconds)) return false;
    if (seconds > this.pending.measuredSeconds) return false;
    if (this.pending.seconds !== seconds) {
      this.pending.seconds = seconds;
      this.revision++;
    }
    return true;
  }

  setPendingType(type) {
    if (this.state !== 'active' || !this.pending || !['time', 'reps'].includes(type)) return false;
    if (type === 'time' && !validSetDuration(this.pending.seconds)) return false;
    if (this.pending.type !== type) {
      this.pending.type = type;
      this.revision++;
    }
    return true;
  }

  updateReps(reps) {
    if (this.state !== 'active' || this.pending?.type !== 'reps' || !validReps(reps)) return false;
    if (this.pending.reps !== reps) {
      this.pending.reps = reps;
      this.revision++;
    }
    return true;
  }

  save() {
    if (this.state !== 'active' || !this.pending) return false;
    if (this.pending.type === 'reps' && !validReps(this.pending.reps)) return false;
    this.sets.push(this.pending);
    this.pending = null;
    this.revision++;
    return true;
  }

  recordRest(id, seconds) {
    if (this.state !== 'active' || !Number.isSafeInteger(seconds) || seconds < 0) return false;
    const set = this.sets.find(set => set.id === id);
    if (!set || set.restSeconds !== null) return false;
    set.restSeconds = seconds;
    this.revision++;
    return true;
  }

  discard() {
    if (!this.pending) return false;
    this.pending = null;
    this.revision++;
    return true;
  }

  remove(id) {
    if (this.state !== 'active') return false;
    const index = this.sets.findIndex(set => set.id === id);
    if (index === -1) return false;
    this.sets.splice(index, 1);
    this.revision++;
    return true;
  }

  finish() {
    if (this.state !== 'active' || this.pending) return false;
    this.state = 'finished';
    this.revision++;
    return true;
  }

  get totalSeconds() {
    return this.sets.reduce((total, set) => total + (set.type === 'time' ? set.seconds : 0), 0);
  }

  get totalReps() {
    return this.sets.reduce((total, set) => total + (set.type === 'reps' ? set.reps : 0), 0);
  }
}
