import test from 'node:test';
import assert from 'node:assert/strict';
import { Session, validReps } from '../session.js';

test('rep counts require a positive whole number and manual saving', () => {
  const session = new Session();
  session.create('Bench press');
  assert.equal(session.record(2, 'reps'), true);
  assert.equal(session.save(), false);
  for (const reps of [null, '', '10', 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(validReps(reps), false);
    assert.equal(session.updateReps(reps), false);
  }
  assert.equal(session.updateReps(12), true); // Reps are not capped by measured seconds.
  assert.equal(session.updatePending(1), false);
  assert.equal(session.totalReps, 0);
  assert.equal(session.save(), true);
  assert.equal(session.save(), false);
  assert.equal(session.sets[0].type, 'reps');
  assert.equal(session.sets[0].reps, 12);
  assert.equal(session.totalReps, 12);
  assert.equal(session.totalSeconds, 0);
});

test('mixed sessions sum time and reps separately and retain rest on the preceding set', () => {
  const session = new Session();
  session.create('Mixed workout');
  session.record(20);
  session.updatePending(15);
  session.save();
  session.recordRest(session.sets[0].id, 10);
  session.record(30, 'reps');
  session.updateReps(8);
  session.save();
  session.recordRest(session.sets[1].id, 12);
  session.record(15, 'reps');
  session.updateReps(10);
  session.save();
  assert.equal(session.totalSeconds, 15);
  assert.equal(session.totalReps, 18);
  assert.deepEqual(session.sets.map(set => set.restSeconds), [10, 12, null]);
  session.remove(session.sets[1].id);
  assert.equal(session.totalReps, 10);
  assert.equal(session.totalSeconds, 15);
  session.finish();
  assert.equal(session.updateReps(5), false);
  session.create('New workout');
  assert.equal(session.totalReps, 0);
  assert.equal(session.totalSeconds, 0);
});

test('pending sets can switch recording type without losing duration bounds', () => {
  const session = new Session();
  session.create();
  session.record(23);
  session.updatePending(20);
  assert.equal(session.setPendingType('reps'), true);
  session.updateReps(8);
  assert.equal(session.setPendingType('time'), true);
  assert.equal(session.pending.seconds, 20);
  assert.equal(session.updatePending(24), false);
  assert.equal(session.updateReps(9), false);
  assert.equal(session.setPendingType('reps'), true);
  assert.equal(session.pending.reps, 8);
  session.discard();
  assert.equal(session.setPendingType('time'), false);
  assert.equal(session.save(), false);
  assert.equal(session.totalReps, 0);
});

test('reps can be saved after an immediate stop but never become a zero-second timed set', () => {
  const session = new Session();
  session.create();
  assert.equal(session.record(0), false);
  assert.equal(session.record(0, 'reps'), true);
  assert.equal(session.setPendingType('time'), false);
  session.updateReps(1);
  session.save();
  assert.equal(session.totalReps, 1);
  assert.equal(session.totalSeconds, 0);
  assert.equal(session.record(2, 'unknown'), false);
  assert.equal(session.setPendingType('reps'), false);
});
