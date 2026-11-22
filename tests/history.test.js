import test from 'node:test';
import assert from 'node:assert/strict';
import { localDateKey, validDateKey, totals, createRecord, validateRecord, parseBackup, serializeBackup, HistoryStore } from '../history.js';
import { Session } from '../session.js';

function fixture() {
  const session = new Session({ now: () => new Date('2026-11-22T23:55:00.000Z') });
  session.create('悬挂与卧推');
  session.record(20);
  session.updatePending(15);
  session.save();
  session.recordRest(session.sets[0].id, 10);
  session.record(0, 'reps');
  session.updateReps(8);
  session.save();
  session.finish();
  return createRecord(session, { id: 'workout-1', date: '2026-11-22', timeZone: 'Asia/Shanghai', savedAt: '2026-11-23T00:05:00.000Z' });
}

test('history snapshot preserves mixed results, original measurements, rest, and metadata', () => {
  const record = fixture();
  assert.deepEqual(totals(record.sets), { sets: 2, seconds: 15, reps: 8 });
  assert.equal(record.sets[0].measuredSeconds, 20);
  assert.equal(record.sets[0].restSeconds, 10);
  assert.equal(record.date, '2026-11-22');
  assert.equal(record.startedAt, '2026-11-22T23:55:00.000Z');
  assert.equal(record.timeZone, 'Asia/Shanghai');
  const copy = validateRecord(record);
  record.sets[0].seconds = 10;
  assert.equal(copy.sets[0].seconds, 15);
  assert.throws(() => createRecord(new Session(), { id: 'x', date: '2026-11-22', timeZone: 'UTC' }), /Finish/);
});

test('JSON round trip retains Unicode, stable IDs, result types, and rest intervals', () => {
  const original = fixture();
  assert.deepEqual(parseBackup(serializeBackup([original])), [original]);
  assert.deepEqual(parseBackup(serializeBackup([])), []);
});

test('dates are real calendar days and local date keys use local fields', () => {
  assert.equal(localDateKey(new Date(2026, 0, 2, 0, 1)), '2026-01-02');
  for (const valid of ['2024-02-29', '2026-11-22', '0001-01-01', '9999-12-31']) assert.equal(validDateKey(valid), true);
  for (const invalid of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-1-1', '0000-01-01', null]) assert.equal(validDateKey(invalid), false);
});

test('invalid backup records reject the whole import before writing any data', () => {
  const valid = fixture();
  const invalidVariants = [
    { ...valid, version: 2 },
    { ...valid, date: '2026-02-30' },
    { ...valid, id: '' },
    { ...valid, timeZone: 'Not/AZone' },
    { ...valid, startedAt: 'yesterday' },
    { ...valid, name: '' },
    { ...valid, sets: [] },
    { ...valid, sets: [{ ...valid.sets[0], seconds: 21 }] },
    { ...valid, sets: [{ ...valid.sets[1], reps: 0 }] },
    { ...valid, sets: [{ ...valid.sets[0], restSeconds: -1 }] },
    { ...valid, sets: [valid.sets[0], valid.sets[0]] },
  ];
  const backup = JSON.parse(serializeBackup([valid]));
  for (const invalid of invalidVariants) {
    assert.throws(() => parseBackup(JSON.stringify({ ...backup, sessions: [valid, invalid] })));
  }
  assert.throws(() => parseBackup('{oops'), /valid TimeCue/);
  assert.throws(() => parseBackup(JSON.stringify({ ...backup, version: 999 })), /Unsupported/);
  assert.throws(() => parseBackup(JSON.stringify({ ...backup, sessions: [valid, valid] })), /duplicate/);
});

test('normalization ignores unrecognized fields and keeps time and reps separate', () => {
  const record = fixture();
  record.totalSeconds = 999999;
  record.sets[0].reps = 100; // A draft may have switched back from Reps to Time.
  const normalized = validateRecord(record);
  assert.equal(normalized.sets[0].reps, null);
  assert.equal('totalSeconds' in normalized, false);
  assert.equal(totals(normalized.sets).seconds, 15);
});

test('failed database opens can be retried', async () => {
  const store = new HistoryStore({ indexedDB: { open() { throw new Error('blocked'); } } });
  await assert.rejects(store.list(), /blocked/);
  assert.equal(store.connection, null);
  await assert.rejects(store.list(), /blocked/);
});
