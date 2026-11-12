import test from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../session.js';
import { Timer } from '../timer.js';

test('sessions accept named activities and provide a date-based default', () => {
  const session = new Session({ now: () => new Date('2026-11-12T10:00:00Z') });
  session.create('  跳绳  ');
  assert.equal(session.name, '跳绳');
  assert.equal(session.create('Replacement'), false);
  assert.equal(session.name, '跳绳');
  session.finish();
  session.create(' ');
  assert.match(session.name, /^Session · /);
  assert.equal(session.createdAt.toISOString(), '2026-11-12T10:00:00.000Z');
});

test('stopped sets require manual saving and cannot be saved twice', () => {
  const session = new Session();
  session.create('Hang');
  assert.equal(session.record(20), true);
  assert.equal(session.totalSeconds, 0);
  assert.equal(session.sets.length, 0);
  assert.equal(session.finish(), false);
  assert.equal(session.record(30), false); // Never silently overwrite an unsaved set.
  assert.equal(session.save(), true);
  assert.equal(session.save(), false);
  assert.equal(session.sets.length, 1);
  assert.equal(session.totalSeconds, 20);
});

test('editing a pending set changes the saved total without changing measured time', () => {
  let now = 0;
  const timer = new Timer({ now: () => now });
  const session = new Session();
  session.create('Hang');
  timer.start();
  now = 20000;
  timer.stop();
  session.record(timer.snapshot().seconds);
  assert.equal(session.updatePending(15), true);
  assert.equal(timer.snapshot().seconds, 20);
  assert.equal(session.totalSeconds, 0);
  session.save();
  assert.equal(session.sets[0].seconds, 15);
  assert.equal(session.totalSeconds, 15);
  assert.equal(session.save(), false);
  assert.equal(session.updatePending(12), false);
  session.record(30);
  assert.equal(session.updatePending(40), false);
  session.updatePending(25);
  session.save();
  session.finish();
  assert.equal(session.totalSeconds, 40);
});

test('invalid duration edits leave the pending set unchanged', () => {
  const session = new Session();
  assert.equal(session.updatePending(15), false);
  session.create('Hang');
  session.record(20);
  for (const value of [0, -1, 0.5, NaN, Infinity, '15', 25, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(session.updatePending(value), false);
    assert.equal(session.pending.seconds, 20);
  }
  session.discard();
  session.finish();
  assert.equal(session.updatePending(15), false);
});

test('adjustments accept whole seconds within the measured duration and stay positive', () => {
  const session = new Session();
  session.create('Hang');
  session.record(23);
  for (const seconds of [20, 15, 10, 5]) assert.equal(session.updatePending(seconds), true);
  assert.equal(session.pending.measuredSeconds, 23);
  assert.equal(session.updatePending(-2), false);
  assert.equal(session.updatePending(0), false);
  for (let seconds = 6; seconds <= 23; seconds++) assert.equal(session.updatePending(seconds), true);
  assert.equal(session.updatePending(24), false);
  session.discard();
  session.record(4);
  assert.equal(session.updatePending(-1), false);
  assert.equal(session.updatePending(9), false);
  session.save();
  assert.equal(session.totalSeconds, 4);
});

test('totals include saved sets only and update after deletion', () => {
  const session = new Session();
  session.create('跳绳');
  for (const seconds of [20, 30, 25]) { session.record(seconds); session.save(); }
  assert.equal(session.totalSeconds, 75);
  session.record(99);
  assert.equal(session.totalSeconds, 75);
  session.discard();
  const removedId = session.sets[1].id;
  assert.equal(session.remove(removedId), true);
  assert.equal(session.remove(removedId), false);
  assert.equal(session.totalSeconds, 45);
  session.record(10);
  session.save();
  assert.equal(new Set(session.sets.map(set => set.id)).size, 3);
  assert.equal(session.totalSeconds, 55);
});

test('finishing freezes the summary; a new session does not inherit earlier sets', () => {
  const session = new Session();
  session.create('First');
  session.record(20);
  session.save();
  assert.equal(session.finish(), true);
  assert.equal(session.state, 'finished');
  assert.equal(session.record(30), false);
  assert.equal(session.remove(session.sets[0].id), false);
  assert.equal(session.totalSeconds, 20);
  session.create('Second');
  assert.equal(session.totalSeconds, 0);
  assert.equal(session.sets.length, 0);
  assert.equal(session.pending, null);
});

test('invalid, empty, and sub-second sets cannot enter the summary', () => {
  const session = new Session();
  assert.equal(session.record(20), false);
  session.create();
  for (const value of [0, -1, 0.5, NaN, Infinity, '20']) assert.equal(session.record(value), false);
  assert.equal(session.save(), false);
  assert.equal(session.finish(), true);
  assert.equal(session.totalSeconds, 0);
});

test('timer integration excludes startup delay, pauses, and rest from saved totals', () => {
  let now = 0;
  const timer = new Timer({ now: () => now });
  const session = new Session();
  session.create('Hang');
  timer.start(3);
  now += 3000;
  timer.advanceCountdown();
  now += 12000;
  timer.pause();
  now += 120000;
  timer.resume();
  now += 8000;
  timer.stop();
  session.record(timer.snapshot().seconds);
  session.save();
  assert.equal(session.totalSeconds, 20);
  now += 60000; // Rest between sets.
  timer.start(3);
  now += 3000;
  timer.advanceCountdown();
  now += 30000;
  timer.stop();
  session.record(timer.snapshot().seconds);
  session.save();
  session.finish();
  assert.equal(session.sets.length, 2);
  assert.equal(session.totalSeconds, 50);
});
