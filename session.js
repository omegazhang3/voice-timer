// Session records are intentionally held in memory only.
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

  record(seconds) {
    if (this.state !== 'active' || this.pending || !Number.isSafeInteger(seconds) || seconds < 1) return false;
    this.pending = { id: this.nextId++, seconds };
    this.revision++;
    return true;
  }

  save() {
    if (this.state !== 'active' || !this.pending) return false;
    this.sets.push(this.pending);
    this.pending = null;
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
    return this.sets.reduce((total, set) => total + set.seconds, 0);
  }
}
