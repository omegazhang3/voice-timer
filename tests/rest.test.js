import test from 'node:test';
import assert from 'node:assert/strict';
import { RestTimer, Timer } from '../timer.js';
import { Session } from '../session.js';

test('rest uses elapsed time, survives delayed updates, and starts fresh after reset', () => {
  let now = 0;
  const rest = new RestTimer({ now: () => now });
  assert.equal(rest.running, false);
  assert.equal(rest.seconds, 0);
  rest.start();
  assert.equal(rest.running, true);
  now = 999;
  assert.equal(rest.seconds, 0);
  now = 65000;
  rest.start(); // Repeated starts must not lose the existing rest period.
  assert.equal(rest.seconds, 65);
  now = 3601000;
  assert.equal(rest.seconds, 3601);
  rest.reset();
  assert.equal(rest.running, false);
  assert.equal(rest.seconds, 0);
  rest.start();
  now += 2000;
  assert.equal(rest.seconds, 2);
});

test('rest does not change set durations, saved totals, or the next announcement boundary', () => {
  let now = 0;
  const timer = new Timer({ now: () => now, interval: 5 });
  const rest = new RestTimer({ now: () => now });
  const session = new Session();
  session.create('Hang');
  timer.start();
  now += 20000;
  timer.stop();
  rest.start();
  session.record(timer.snapshot().seconds);
  now += 12000;
  session.updatePending(15);
  session.save();
  assert.equal(rest.seconds, 12);
  assert.equal(timer.snapshot().seconds, 20);
  assert.equal(timer.pollAnnouncement(), null);
  assert.equal(session.totalSeconds, 15);

  timer.start(3);
  now += 2000;
  assert.equal(rest.seconds, 14);
  assert.equal(timer.snapshot().seconds, 0);
  timer.stop(); // Cancelled preparation does not end rest.
  now += 4000;
  assert.equal(rest.seconds, 18);
  timer.start(3);
  now += 3000;
  assert.equal(timer.advanceCountdown(), true);
  rest.reset();
  assert.equal(timer.snapshot().seconds, 0);
  assert.equal(rest.running, false);
  now += 4999;
  assert.equal(timer.pollAnnouncement(), null);
  now += 1;
  assert.equal(timer.pollAnnouncement(), 5);
  timer.stop();
  rest.start();
  assert.equal(rest.seconds, 0);
  session.record(timer.snapshot().seconds);
  session.save();
  assert.equal(session.totalSeconds, 20);
});
