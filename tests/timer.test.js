import test from 'node:test';
import assert from 'node:assert/strict';
import { Timer, validInterval, formatTime, spokenTime } from '../timer.js';

function clock(interval = 30) {
  let now = 0;
  return { timer: new Timer({ interval, now: () => now }), advance: ms => { now += ms; } };
}

test('announces at the interval once, independent of tick frequency', () => {
  const { timer, advance } = clock();
  timer.start();
  advance(29999);
  assert.equal(timer.pollAnnouncement(), null);
  advance(1);
  assert.equal(timer.pollAnnouncement(), 30);
  assert.equal(timer.pollAnnouncement(), null);
  advance(30000);
  assert.equal(timer.pollAnnouncement(), 60);
});

test('pause excludes time away and preserves remaining interval', () => {
  const { timer, advance } = clock();
  timer.start();
  advance(22000);
  timer.pause();
  advance(120000);
  assert.equal(timer.snapshot().seconds, 22);
  assert.equal(timer.snapshot().nextIn, 8);
  assert.equal(timer.pollAnnouncement(), null);
  timer.resume();
  advance(7999);
  assert.equal(timer.pollAnnouncement(), null);
  advance(1);
  assert.equal(timer.pollAnnouncement(), 30);
});

test('delayed updates announce current elapsed time once without a backlog', () => {
  const { timer, advance } = clock(10);
  timer.start();
  advance(47000);
  assert.equal(timer.pollAnnouncement(), 47);
  assert.equal(timer.pollAnnouncement(), null);
  advance(3000);
  assert.equal(timer.pollAnnouncement(), 50);
});

test('stop freezes final time; start again resets time and announcements', () => {
  const { timer, advance } = clock(5);
  timer.start();
  advance(12000);
  assert.equal(timer.pollAnnouncement(), 12);
  timer.stop();
  advance(60000);
  assert.equal(timer.snapshot().seconds, 12);
  assert.equal(timer.pollAnnouncement(), null);
  timer.start();
  assert.equal(timer.snapshot().seconds, 0);
  advance(5000);
  assert.equal(timer.pollAnnouncement(), 5);
});

test('stopping from pause preserves the final time', () => {
  const { timer, advance } = clock();
  timer.start();
  advance(1250);
  timer.pause();
  advance(50000);
  timer.stop();
  assert.equal(timer.elapsedMs, 1250);
});

test('intervals require whole seconds and cannot change during a session', () => {
  for (const value of [0, 4, 5.5, 3601, NaN, Infinity, '30']) assert.equal(validInterval(value), false);
  for (const value of [5, 17, 30, 3600]) assert.equal(validInterval(value), true);
  const { timer } = clock();
  assert.throws(() => timer.setInterval(0), RangeError);
  timer.start();
  assert.equal(timer.setInterval(10), false);
  timer.pause();
  assert.equal(timer.setInterval(10), false);
  timer.stop();
  assert.equal(timer.setInterval(10), true);
  assert.equal(timer.interval, 10);
});

test('formats minute/hour boundaries and natural English speech', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(59.9), '00:59');
  assert.equal(formatTime(60), '01:00');
  assert.equal(formatTime(3661), '01:01:01');
  assert.equal(spokenTime(30), '30 seconds elapsed.');
  assert.equal(spokenTime(60), '1 minute elapsed.');
  assert.equal(spokenTime(90), '1 minute 30 seconds elapsed.');
  assert.equal(spokenTime(3661), '1 hour 1 minute 1 second elapsed.');
});
