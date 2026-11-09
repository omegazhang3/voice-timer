export const DEFAULT_INTERVAL = 30;
export const MIN_INTERVAL = 5;
export const MAX_INTERVAL = 3600;

export function validInterval(value) {
  return Number.isInteger(value) && value >= MIN_INTERVAL && value <= MAX_INTERVAL;
}

export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = value => String(value).padStart(2, '0');
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`;
}

export function spokenTime(seconds, short = false) {
  const total = Math.max(0, Math.floor(seconds));
  if (short) return total + ' second' + (total === 1 ? '' : 's') + '.';
  const parts = [];
  const units = [[Math.floor(total / 3600), 'hour'], [Math.floor((total % 3600) / 60), 'minute'], [total % 60, 'second']];
  for (const [value, unit] of units) {
    if (value) parts.push(`${value} ${unit}${value === 1 ? '' : 's'}`);
  }
  return `${parts.join(' ') || '0 seconds'} elapsed.`;
}

export class Timer {
  constructor({ now = () => performance.now(), interval = DEFAULT_INTERVAL } = {}) {
    this.now = now;
    this.state = 'idle';
    this.accumulated = 0;
    this.startedAt = 0;
    this.lastBucket = 0;
    this.setInterval(interval);
  }

  setInterval(value) {
    if (this.state === 'running' || this.state === 'paused') return false;
    if (!validInterval(value)) throw new RangeError('Choose a whole number from 5 to 3600.');
    this.interval = value;
    return true;
  }

  get elapsedMs() {
    return this.accumulated + (this.state === 'running' ? Math.max(0, this.now() - this.startedAt) : 0);
  }

  start() {
    if (this.state !== 'idle' && this.state !== 'stopped') return;
    this.accumulated = 0;
    this.lastBucket = 0;
    this.startedAt = this.now();
    this.state = 'running';
  }

  pause() {
    if (this.state !== 'running') return;
    this.accumulated = this.elapsedMs;
    this.state = 'paused';
  }

  resume() {
    if (this.state !== 'paused') return;
    this.startedAt = this.now();
    this.state = 'running';
  }

  stop() {
    if (this.state !== 'running' && this.state !== 'paused') return;
    this.accumulated = this.elapsedMs;
    this.state = 'stopped';
  }

  snapshot() {
    const elapsedMs = this.elapsedMs;
    const period = this.interval * 1000;
    const remainder = elapsedMs % period;
    return {
      state: this.state,
      seconds: Math.floor(elapsedMs / 1000),
      nextIn: Math.ceil((period - remainder) / 1000),
      progress: remainder / period,
    };
  }

  pollAnnouncement() {
    if (this.state !== 'running') return null;
    const seconds = Math.floor(this.elapsedMs / 1000);
    const bucket = Math.floor(seconds / this.interval);
    if (bucket <= this.lastBucket) return null;
    this.lastBucket = bucket;
    // A delayed tick announces the current time once, never a backlog.
    return seconds;
  }
}
