import { DEFAULT_INTERVAL, DEFAULT_START_DELAY, START_DELAYS, Timer, formatTime, spokenTime, validInterval } from './timer.js';

const $ = id => document.getElementById(id);
const storageKey = 'voice-timer.interval';
const shortSpeechKey = 'voice-timer.short-speech';
const startDelayKey = 'voice-timer.start-delay';
let savedInterval = DEFAULT_INTERVAL;
let startDelay = DEFAULT_START_DELAY;
let lastCountdownSpoken = null;
let shortSpeech = false;
let storageAvailable = true;
try {
  const stored = Number(localStorage.getItem(storageKey));
  if (validInterval(stored)) savedInterval = stored;
  shortSpeech = localStorage.getItem(shortSpeechKey) === 'true';
  const storedDelay = localStorage.getItem(startDelayKey);
  if (storedDelay !== null && START_DELAYS.includes(Number(storedDelay))) startDelay = Number(storedDelay);
} catch { storageAvailable = false; }

const timer = new Timer({ interval: savedInterval });
const synth = window.speechSynthesis;
const supportsSpeech = Boolean(synth && window.SpeechSynthesisUtterance);
let englishVoice;
let speechGeneration = 0;
let currentUtterance;
let ticker;
let intervalIsValid = true;
let voiceFailed = false;
const defaultVoiceMessage = 'Uses your device’s English voice. Check your volume before starting.';

function voiceMessage(text, error = false) {
  $('voice-message').textContent = text;
  $('voice-message').classList.toggle('error', error);
}

function findVoice() {
  const voices = synth.getVoices().filter(voice => /^en(?:-|_)/i.test(voice.lang) || voice.lang === 'en');
  englishVoice = voices.find(voice => voice.localService && voice.lang === 'en-US')
    || voices.find(voice => voice.localService)
    || voices.find(voice => voice.lang === 'en-US')
    || voices[0];
}

function cancelSpeech() {
  speechGeneration += 1;
  if (supportsSpeech) synth.cancel();
  currentUtterance = undefined;
}

function speak(text, preview = false) {
  if (!supportsSpeech) return;
  cancelSpeech();
  const generation = speechGeneration;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.95;
  if (englishVoice) utterance.voice = englishVoice;
  utterance.onstart = () => {
    if (generation !== speechGeneration) return;
    voiceFailed = false;
    voiceMessage(preview ? 'Playing a sample. Adjust your device volume as needed.' : defaultVoiceMessage);
  };
  utterance.onend = () => {
    if (generation !== speechGeneration) return;
    currentUtterance = undefined;
    if (preview) voiceMessage('Sample finished. If you heard nothing, check your media volume and English voice settings.');
  };
  utterance.onerror = event => {
    if (generation !== speechGeneration || ['canceled', 'interrupted'].includes(event.error)) return;
    voiceFailed = true;
    voiceMessage('Voice playback failed. Pause the timer, check your English voice settings, then use Test voice to try again.', true);
  };
  currentUtterance = utterance;
  try {
    synth.speak(currentUtterance);
  } catch {
    voiceFailed = true;
    voiceMessage('Voice playback is unavailable. Check your browser’s speech support and English voice settings.', true);
  }
}

function updateIntervalUI() {
  document.querySelectorAll('[data-interval]').forEach(button => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.interval) === timer.interval));
  });
}

function setIntervalValue(value) {
  if (!validInterval(value)) {
    intervalIsValid = false;
    $('interval-error').textContent = 'Enter a whole number from 5 to 3,600 seconds.';
    $('interval-error').hidden = false;
    $('custom-interval').setAttribute('aria-invalid', 'true');
    document.querySelectorAll('[data-interval]').forEach(button => button.setAttribute('aria-pressed', 'false'));
  } else {
    timer.setInterval(value);
    intervalIsValid = true;
    $('interval-error').hidden = true;
    $('interval-error').textContent = '';
    $('custom-interval').removeAttribute('aria-invalid');
    try { localStorage.setItem(storageKey, String(value)); } catch {
      storageAvailable = false;
    }
    updateIntervalUI();
  }
  render();
}

function render() {
  const { state, seconds, nextIn, progress, countdownSeconds } = timer.snapshot();
  const countingDown = state === 'countdown';
  const active = countingDown || state === 'running' || state === 'paused';
  const statuses = { idle: 'Ready', countdown: 'Get ready', running: 'Running', paused: 'Paused', stopped: 'Finished' };
  const primaryLabels = { idle: 'Start timer', countdown: 'Get ready…', running: 'Pause', paused: 'Resume', stopped: 'Start again' };
  const captions = {
    idle: 'A fresh start, whenever you’re ready.',
    countdown: 'Get into position. Timing begins after the countdown.',
    running: `A voice update every ${timer.interval} seconds.`,
    paused: 'Take your time. Resume when you’re ready.',
    stopped: 'Nicely done. Your final time is shown here.',
  };
  const nextLabels = { idle: 'First announcement in', countdown: 'Timing starts in', running: 'Next announcement in', paused: 'After you resume', stopped: 'Session complete' };
  $('clock').textContent = countingDown ? String(countdownSeconds) : formatTime(seconds);
  $('clock').classList.toggle('counting-down', countingDown);
  $('clock').setAttribute('aria-label', countingDown ? 'Seconds until timing starts' : 'Elapsed time');
  $('clock').classList.toggle('has-hours', seconds >= 3600);
  $('clock-label').textContent = countingDown ? 'STARTING IN' : state === 'stopped' ? 'FINAL TIME' : 'ELAPSED TIME';
  // Only update the live status when it changes, not on every tick.
  if ($('status-text').textContent !== statuses[state]) $('status-text').textContent = statuses[state];
  $('timer-status').dataset.state = state;
  $('timer-caption').textContent = captions[state];
  $('primary-label').textContent = primaryLabels[state];
  $('primary-icon').textContent = state === 'running' ? 'Ⅱ' : '▶';
  $('primary-button').disabled = countingDown || (!active && !intervalIsValid);
  $('stop-button').disabled = !active;
  $('stop-label').textContent = countingDown ? 'Cancel' : 'Stop';
  $('interval-settings').disabled = active;
  $('start-settings').disabled = active;
  $('test-voice').disabled = !supportsSpeech || countingDown || state === 'running';
  $('interval-help').textContent = active ? 'Stop the timer to change your interval.'
    : storageAvailable ? '5–3,600 seconds. Saved on this device.'
    : '5–3,600 seconds. Browser storage is unavailable; this setting lasts for this visit.';
  $('next-label').textContent = nextLabels[state];
  $('next-time').textContent = state === 'stopped' ? '—' : formatTime(countingDown ? countdownSeconds : nextIn);
  $('progress-fill').style.transform = `scaleX(${state === 'stopped' ? 1 : progress})`;
}

function tick() {
  const justStarted = timer.advanceCountdown();
  if (timer.state === 'countdown') {
    const remaining = timer.snapshot().countdownSeconds;
    if (remaining !== lastCountdownSpoken) {
      lastCountdownSpoken = remaining;
      if (!voiceFailed) speak(String(remaining));
    }
    render();
    return;
  }
  const announcement = timer.pollAnnouncement();
  if (announcement !== null && !voiceFailed) speak(spokenTime(announcement, shortSpeech));
  else if (justStarted && !voiceFailed) speak('Go!');
  render();
}

function startTicker() {
  clearInterval(ticker);
  ticker = setInterval(tick, 100);
}

$('primary-button').addEventListener('click', () => {
  if (timer.state === 'countdown') return;
  if (timer.state === 'running') {
    // Consume any boundary reached just before pausing, without queuing speech.
    timer.pollAnnouncement();
    timer.pause();
    clearInterval(ticker);
    cancelSpeech();
  } else if (timer.state === 'paused') {
    timer.resume();
    voiceFailed = false;
    speak('Timer resumed.');
    startTicker();
  } else {
    setIntervalValue(Number($('custom-interval').value));
    if (!intervalIsValid) { $('custom-interval').focus(); return; }
    timer.start(startDelay);
    voiceFailed = false;
    // Speaking in the click handler also activates audio on mobile browsers.
    lastCountdownSpoken = startDelay > 0 ? startDelay : null;
    speak(startDelay > 0 ? String(startDelay) : 'Timer started.');
    startTicker();
  }
  render();
});

$('stop-button').addEventListener('click', () => {
  timer.stop();
  clearInterval(ticker);
  cancelSpeech();
  render();
});

$('test-voice').addEventListener('click', () => {
  voiceFailed = false;
  const sample = spokenTime(timer.interval, shortSpeech);
  speak(shortSpeech ? sample : 'Voice Timer is ready. ' + sample, true);
});

$('short-announcements').addEventListener('change', event => {
  shortSpeech = event.target.checked;
  cancelSpeech();
  try { localStorage.setItem(shortSpeechKey, String(shortSpeech)); } catch {
    storageAvailable = false;
  }
  render();
});

$('custom-interval').addEventListener('input', event => setIntervalValue(Number(event.target.value)));
$('start-delay').addEventListener('change', event => {
  const value = Number(event.target.value);
  if (!START_DELAYS.includes(value)) return;
  startDelay = value;
  try { localStorage.setItem(startDelayKey, String(value)); } catch { storageAvailable = false; }
  render();
});
document.querySelectorAll('[data-interval]').forEach(button => button.addEventListener('click', () => {
  $('custom-interval').value = button.dataset.interval;
  setIntervalValue(Number(button.dataset.interval));
}));

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && ['countdown', 'running'].includes(timer.state)) tick();
});
window.addEventListener('pagehide', () => {
  // Do not keep speaking after the page has been left.
  if (timer.state === 'countdown') timer.stop();
  else timer.pause();
  clearInterval(ticker);
  cancelSpeech();
});
window.addEventListener('pageshow', () => render());

if (supportsSpeech) {
  findVoice();
  synth.addEventListener('voiceschanged', findVoice);
} else {
  voiceMessage('This browser does not support voice playback. You can still use the stopwatch. Try a recent Chrome, Edge, or Safari browser for speech.', true);
}
$('custom-interval').value = String(savedInterval);
$('short-announcements').checked = shortSpeech;
$('start-delay').value = String(startDelay);
updateIntervalUI();
render();
