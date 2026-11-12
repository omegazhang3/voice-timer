import { DEFAULT_INTERVAL, DEFAULT_START_DELAY, START_DELAYS, Timer, formatTime, spokenTime, validInterval } from './timer.js';
import { Session, validSetDuration } from './session.js';

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

let timer = new Timer({ interval: savedInterval });
let session = new Session();
let sessionRenderKey = '';
let pendingEditorId = null;
let pendingAction = null;
let unloadWarningActive = false;
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
  const sessionFinished = session.state === 'finished';
  const displayedSeconds = sessionFinished ? session.totalSeconds : seconds;
  const countingDown = state === 'countdown';
  const active = countingDown || state === 'running' || state === 'paused';
  const statuses = { idle: 'Ready', countdown: 'Get ready', running: 'Running', paused: 'Paused', stopped: 'Finished' };
  const primaryLabels = { idle: 'Start timer', countdown: 'Get ready…', running: 'Pause', paused: 'Resume', stopped: 'Start again' };
  if (session.state === 'active' && state === 'stopped') primaryLabels.stopped = 'Next set';
  if (session.state === 'finished') primaryLabels[state] = 'Session finished';
  const captions = {
    idle: 'A fresh start, whenever you’re ready.',
    countdown: 'Get into position. Timing begins after the countdown.',
    running: `A voice update every ${timer.interval} seconds.`,
    paused: 'Take your time. Resume when you’re ready.',
    stopped: 'Nicely done. Your final time is shown here.',
  };
  if (session.state === 'finished') captions[state] = 'Session complete. Your summary is below.';
  const nextLabels = { idle: 'First announcement in', countdown: 'Timing starts in', running: 'Next announcement in', paused: 'After you resume', stopped: 'Set complete' };
  $('clock').textContent = countingDown ? String(countdownSeconds) : formatTime(displayedSeconds);
  $('clock').classList.toggle('counting-down', countingDown);
  $('clock').setAttribute('aria-label', sessionFinished ? 'Session total time' : countingDown ? 'Seconds until timing starts' : 'Elapsed time');
  $('clock').classList.toggle('has-hours', displayedSeconds >= 3600);
  $('clock-label').textContent = sessionFinished ? 'SESSION TOTAL' : countingDown ? 'STARTING IN' : state === 'stopped' ? 'FINAL TIME' : 'ELAPSED TIME';
  // Only update the live status when it changes, not on every tick.
  if ($('status-text').textContent !== statuses[state]) $('status-text').textContent = statuses[state];
  $('timer-status').dataset.state = state;
  $('timer-caption').textContent = captions[state];
  $('primary-label').textContent = primaryLabels[state];
  $('primary-icon').textContent = state === 'running' ? 'Ⅱ' : '▶';
  $('primary-button').disabled = session.state === 'finished' || countingDown || (!active && !intervalIsValid);
  $('stop-button').disabled = !active;
  $('stop-label').textContent = countingDown ? 'Cancel' : 'Stop';
  $('interval-settings').disabled = active;
  $('start-settings').disabled = active;
  $('test-voice').disabled = !supportsSpeech || countingDown || state === 'running';
  $('interval-help').textContent = active ? 'Stop the timer to change your interval.'
    : storageAvailable ? '5–3,600 seconds. Saved on this device.'
    : '5–3,600 seconds. Browser storage is unavailable; this setting lasts for this visit.';
  $('next-label').textContent = sessionFinished ? 'Saved sets' : nextLabels[state];
  $('next-time').textContent = sessionFinished ? String(session.sets.length) : state === 'stopped' ? '—' : formatTime(countingDown ? countdownSeconds : nextIn);
  $('progress-fill').style.transform = `scaleX(${state === 'stopped' ? 1 : progress})`;
  renderSession();
}

function warnBeforeUnload(event) {
  event.preventDefault();
  event.returnValue = '';
}

function renderSession() {
  const key = session.state + ':' + session.revision + ':' + timer.state;
  if (key === sessionRenderKey) return;
  sessionRenderKey = key;
  const exists = session.state !== 'empty';
  const finished = session.state === 'finished';
  const busy = ['countdown', 'running', 'paused'].includes(timer.state);
  $('session-form').hidden = exists;
  $('session-actions').hidden = !exists;
  $('session-records').hidden = !exists;
  $('session-heading').textContent = exists ? session.name : 'Give your practice a name.';
  $('session-status').textContent = finished ? 'SESSION COMPLETE' : exists ? 'ACTIVE SESSION' : 'SESSION';
  $('session-description').textContent = exists
    ? session.createdAt.toLocaleString() + ' · This page only'
    : 'Create a session, or press Start for an automatically named one.';
  $('finish-session').hidden = finished;
  $('finish-session').disabled = busy;
  $('finish-session').title = busy ? 'Stop the timer before finishing your session.' : '';
  $('new-session').hidden = !finished;
  $('records-eyebrow').textContent = finished ? 'WELL DONE' : 'YOUR PROGRESS';
  $('records-heading').textContent = finished ? 'Session summary' : 'Saved sets';
  $('set-count').textContent = String(session.sets.length);
  $('session-total').textContent = formatTime(session.totalSeconds);
  $('sets-empty').hidden = session.sets.length > 0;
  $('sets-empty').textContent = finished ? 'This session finished with no saved sets.' : 'No sets saved yet. Stop the timer, then choose Save set.';
  $('sets-table-wrap').hidden = session.sets.length === 0;
  const rows = session.sets.map((set, index) => {
    const row = document.createElement('tr');
    const number = document.createElement('td');
    number.textContent = 'Set ' + (index + 1);
    const duration = document.createElement('td');
    duration.textContent = formatTime(set.seconds);
    const actions = document.createElement('td');
    if (!finished) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'delete-set';
      remove.textContent = 'Delete';
      remove.setAttribute('aria-label', 'Delete set ' + (index + 1));
      remove.addEventListener('click', () => {
        if (session.remove(set.id)) {
          $('set-feedback').textContent = 'Set removed from this session.';
          render();
        }
      });
      actions.append(remove);
    }
    row.append(number, duration, actions);
    return row;
  });
  $('sets-list').replaceChildren(...rows);
  $('set-review').hidden = !session.pending || timer.state !== 'stopped';
  if (session.pending) {
    if (pendingEditorId !== session.pending.id) {
      pendingEditorId = session.pending.id;
      $('set-duration').value = String(session.pending.seconds);
      $('set-duration-error').hidden = true;
      $('set-duration').removeAttribute('aria-invalid');
    }
    $('pending-time').textContent = formatTime(timer.snapshot().seconds);
    $('save-set').disabled = !validPendingDuration();
  } else {
    pendingEditorId = null;
  }
  if (exists !== unloadWarningActive) {
    window[exists ? 'addEventListener' : 'removeEventListener']('beforeunload', warnBeforeUnload);
    unloadWarningActive = exists;
  }
}

function ensureSession() {
  if (session.state === 'empty') session.create($('session-name').value);
}

function validPendingDuration() {
  return validSetDuration(Number($('set-duration').value)) && $('set-duration').validity.valid;
}

function syncPendingDuration() {
  if (!session.pending) return false;
  const valid = validPendingDuration();
  $('set-duration-error').hidden = valid;
  $('set-duration').setAttribute('aria-invalid', String(!valid));
  $('save-set').disabled = !valid;
  $('pending-save').disabled = !valid;
  if (valid) session.updatePending(Number($('set-duration').value));
  return valid;
}

function savePendingSet() {
  if (!syncPendingDuration()) return false;
  if (!session.save()) return false;
  $('set-feedback').textContent = 'Set ' + session.sets.length + ' saved · ' + formatTime(session.sets.at(-1).seconds);
  render();
  return true;
}

function resolvePending(action, purpose) {
  if (!session.pending) { action(); return; }
  const valid = syncPendingDuration();
  pendingAction = action;
  $('pending-dialog-description').textContent = valid
    ? 'Your ' + formatTime(session.pending.seconds) + ' set has not been saved. Save or discard it before ' + purpose + '.'
    : 'The set duration is invalid. Choose Keep editing to correct it, or discard the set before ' + purpose + '.';
  $('pending-dialog').showModal();
}

function startFreshSet() {
  ensureSession();
  if (session.state !== 'active') return;
  $('set-feedback').textContent = '';
  timer.start(startDelay);
  voiceFailed = false;
  // This also activates speech on mobile browsers when started by a click.
  lastCountdownSpoken = startDelay > 0 ? startDelay : null;
  speak(startDelay > 0 ? String(startDelay) : 'Timer started.');
  startTicker();
  render();
}

function finishSession() {
  if (!session.finish()) return;
  cancelSpeech();
  render();
  $('records-heading').tabIndex = -1;
  $('records-heading').focus();
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
  if (session.state === 'finished' || timer.state === 'countdown') return;
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
    resolvePending(startFreshSet, 'starting the next set');
  }
  render();
});

$('stop-button').addEventListener('click', () => {
  const wasCountingDown = timer.state === 'countdown';
  if (!['countdown', 'running', 'paused'].includes(timer.state)) return;
  timer.stop();
  clearInterval(ticker);
  cancelSpeech();
  if (!wasCountingDown) {
    const seconds = timer.snapshot().seconds;
    session.record(seconds);
    $('set-feedback').textContent = seconds > 0 ? 'Save this set to add it to your session.' : 'Time at least one full second to save a set.';
  }
  render();
});

$('session-form').addEventListener('submit', event => {
  event.preventDefault();
  ensureSession();
  render();
});
$('save-set').addEventListener('click', savePendingSet);
$('set-duration').addEventListener('input', () => {
  syncPendingDuration();
  render();
});
$('set-duration').addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    savePendingSet();
  }
});
$('finish-session').addEventListener('click', () => {
  if (['countdown', 'running', 'paused'].includes(timer.state)) return;
  resolvePending(finishSession, 'finishing this session');
});
$('pending-save').addEventListener('click', () => {
  const action = pendingAction;
  if (!action || !savePendingSet()) return;
  pendingAction = null;
  $('pending-dialog').close();
  action();
});
$('pending-discard').addEventListener('click', () => {
  const action = pendingAction;
  if (!action) return;
  session.discard();
  $('set-feedback').textContent = 'Unsaved set discarded.';
  pendingAction = null;
  $('pending-dialog').close();
  action();
});
$('pending-cancel').addEventListener('click', () => {
  pendingAction = null;
  $('pending-dialog').close();
  $('set-duration').focus();
});
$('pending-dialog').addEventListener('cancel', () => { pendingAction = null; });
$('new-session').addEventListener('click', () => {
  if (session.state !== 'finished') return;
  if (session.sets.length && !window.confirm('Starting a new session clears this session and its saved sets. Continue?')) return;
  clearInterval(ticker);
  cancelSpeech();
  timer = new Timer({ interval: timer.interval });
  session = new Session();
  sessionRenderKey = '';
  $('session-name').value = '';
  $('set-feedback').textContent = '';
  render();
  $('session-name').focus();
});

$('test-voice').addEventListener('click', () => {
  voiceFailed = false;
  const sample = spokenTime(timer.interval, shortSpeech);
  speak(shortSpeech ? sample : 'TimeCue is ready. ' + sample, true);
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
