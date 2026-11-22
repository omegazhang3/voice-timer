import { HistoryStore, createRecord, localDateKey, validDateKey, totals, parseBackup, serializeBackup } from './history.js';
import { formatTime } from './timer.js';

const $ = id => document.getElementById(id);
const dateLabel = date => new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });
const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};
const summary = sets => {
  const sum = totals(sets);
  const parts = [sum.sets + (sum.sets === 1 ? ' set' : ' sets')];
  if (sets.some(set => set.type === 'time')) parts.push(formatTime(sum.seconds) + ' timed');
  if (sets.some(set => set.type === 'reps')) parts.push(sum.reps + ' reps');
  return parts.join(' · ');
};

export function createCalendar({ onChange = () => {} } = {}) {
  const store = new HistoryStore();
  let records = [];
  let busy = false;
  let available = false;
  let selected = localDateKey();
  let month = selected.slice(0, 7);
  let currentSession = null;
  let currentId = null;
  let currentTimeZone = 'UTC';
  let currentTrainingDate = null;
  let pendingImport = null;
  let pickingFile = false;

  function isSaved(session) {
    return session === currentSession && records.some(record => record.id === currentId);
  }

  function message(text, error = false) {
    $('calendar-message').textContent = text;
    $('calendar-message').classList.toggle('error', error);
  }

  function renderSave() {
    const finished = currentSession?.state === 'finished' && currentSession.sets.length > 0;
    $('calendar-save-form').hidden = !finished;
    const saved = records.find(record => record.id === currentId);
    const unchanged = saved && saved.date === $('calendar-save-date').value;
    $('save-to-calendar').disabled = !finished || busy || !available || Boolean(unchanged);
    $('calendar-save-date').disabled = busy;
    $('save-to-calendar').textContent = unchanged ? 'Saved to calendar' : saved ? 'Update calendar date' : 'Save to calendar';
    $('calendar-save-status').textContent = saved
      ? 'Saved for ' + dateLabel(saved.date) + ' on this browser.'
      : available ? 'Save this completed session to keep it after closing the page.' : 'Calendar storage is unavailable. Use Retry below; your current session is still here.';
  }

  function render() {
    renderSave();
    $('calendar-export').disabled = busy || !available || records.length === 0;
    $('calendar-import').disabled = busy || !available;
    $('calendar-import-confirm').disabled = busy || !pendingImport;
    $('calendar-import-cancel').disabled = busy;
    $('calendar-retry').disabled = busy;
    $('calendar-month').textContent = new Date(month + '-01T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long' });
    $('calendar-prev').disabled = month === '0001-01';
    $('calendar-next').disabled = month === '9999-12';
    const first = new Date(month + '-01T12:00:00Z');
    const last = new Date(first);
    last.setUTCMonth(last.getUTCMonth() + 1, 0);
    const counts = new Map();
    for (const record of records) counts.set(record.date, (counts.get(record.date) || 0) + 1);
    const days = [];
    for (let index = 0; index < first.getUTCDay(); index++) {
      const blank = node('span');
      blank.setAttribute('aria-hidden', 'true');
      days.push(blank);
    }
    for (let day = 1; day <= last.getUTCDate(); day++) {
      const date = month + '-' + String(day).padStart(2, '0');
      const count = counts.get(date) || 0;
      const button = node('button', undefined, 'calendar-day');
      button.type = 'button';
      button.dataset.date = date;
      button.setAttribute('aria-pressed', String(date === selected));
      button.setAttribute('aria-label', dateLabel(date) + ', ' + count + (count === 1 ? ' session' : ' sessions'));
      if (date === localDateKey()) button.setAttribute('aria-current', 'date');
      button.append(node('span', String(day)), node('small', count ? '• ' + count : ''));
      button.addEventListener('click', () => { selected = date; render(); });
      days.push(button);
    }
    $('calendar-days').replaceChildren(...days);
    $('calendar-date-heading').textContent = dateLabel(selected);
    const daily = records.filter(record => record.date === selected).sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id));
    $('calendar-day-summary').textContent = daily.length
      ? daily.length + (daily.length === 1 ? ' session · ' : ' sessions · ') + summary(daily.flatMap(record => record.sets))
      : available ? 'No sessions saved for this day.' : 'Calendar records could not be loaded. Try again below.';
    const cards = daily.map(record => {
      const article = node('article', undefined, 'calendar-record');
      article.dataset.recordId = record.id;
      const details = node('details');
      const heading = node('summary');
      heading.append(node('strong', record.name), node('span', summary(record.sets)));
      details.append(heading);
      const table = node('table', undefined, 'sets-table');
      const head = node('tr');
      for (const label of ['Set', 'Result', 'Rest after']) {
        const cell = node('th', label);
        cell.scope = 'col';
        head.append(cell);
      }
      const thead = node('thead');
      thead.append(head);
      const tbody = node('tbody');
      record.sets.forEach((set, index) => {
        const row = node('tr');
        const result = node('td', set.type === 'reps' ? set.reps + (set.reps === 1 ? ' rep' : ' reps') : formatTime(set.seconds));
        result.append(node('small', 'Measured ' + formatTime(set.measuredSeconds), 'calendar-measured'));
        row.append(node('td', 'Set ' + (index + 1)), result, node('td', set.restSeconds === null ? '—' : formatTime(set.restSeconds)));
        tbody.append(row);
      });
      table.append(thead, tbody);
      const wrap = node('div', undefined, 'sets-table-wrap');
      wrap.append(table);
      details.append(wrap, node('p', 'Started ' + new Date(record.startedAt).toLocaleString('en-US', { timeZone: record.timeZone }) + ' · ' + record.timeZone, 'session-note'));
      const remove = node('button', 'Delete session', 'delete-set');
      remove.type = 'button';
      remove.disabled = busy;
      remove.setAttribute('aria-label', 'Delete session ' + record.name);
      remove.addEventListener('click', () => {
        if (busy || !window.confirm('Delete “' + record.name + '” from the calendar? This cannot be undone.')) return;
        run(async () => {
          await store.remove(record.id);
          records = await store.list();
          message('Session deleted from the calendar.');
        });
      });
      article.append(details, remove);
      return article;
    });
    $('calendar-records').replaceChildren(...cards);
  }

  async function run(action) {
    if (busy) return;
    busy = true;
    render();
    onChange();
    try { await action(); }
    catch (error) {
      const text = error.message || 'Calendar operation failed. Please retry.';
      message(text, true);
      if ($('calendar-import-dialog').open) {
        $('calendar-import-error').textContent = text;
        $('calendar-import-error').hidden = false;
      }
    }
    finally { busy = false; render(); onChange(); }
  }

  function refresh() {
    return run(async () => {
      try {
        records = await store.list();
        available = true;
        message('Calendar ready · ' + records.length + (records.length === 1 ? ' saved session.' : ' saved sessions.'));
      } catch (error) { available = false; throw error; }
    });
  }

  function setSession(session) {
    if (currentSession !== session) {
      currentSession = session;
      currentId = null;
      currentTrainingDate = null;
    }
    if (session.createdAt && !currentTrainingDate) {
      currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      currentTrainingDate = localDateKey(session.createdAt);
    }
    // Assign once per finished session; repeated saves retain the same identity.
    if (session.state === 'finished' && session.sets.length && !currentId) {
      currentId = crypto.randomUUID();
      $('calendar-save-date').value = currentTrainingDate;
    }
    renderSave();
  }

  $('calendar-save-date').addEventListener('input', renderSave);
  $('calendar-save-form').addEventListener('submit', event => {
    event.preventDefault();
    if (busy || !available || currentSession?.state !== 'finished' || !currentSession.sets.length) return;
    const date = $('calendar-save-date').value;
    if (!validDateKey(date)) {
      message('Choose a valid calendar date before saving.', true);
      $('calendar-save-date').focus();
      return;
    }
    // Capture the snapshot before any asynchronous work.
    let record;
    try { record = createRecord(currentSession, { id: currentId, date, timeZone: currentTimeZone }); }
    catch (error) { message(error.message, true); return; }
    run(async () => {
      await store.save(record);
      records = await store.list();
      selected = date;
      month = date.slice(0, 7);
      message('Session saved for ' + dateLabel(date) + '.');
    });
  });

  for (const [id, offset] of [['calendar-prev', -1], ['calendar-next', 1]]) {
    $(id).addEventListener('click', () => {
      const date = new Date(month + '-01T12:00:00Z');
      date.setUTCMonth(date.getUTCMonth() + offset);
      const key = date.toISOString().slice(0, 10);
      if (!validDateKey(key)) return;
      selected = key;
      month = key.slice(0, 7);
      render();
    });
  }
  $('calendar-today').addEventListener('click', () => { selected = localDateKey(); month = selected.slice(0, 7); render(); });
  $('calendar-retry').addEventListener('click', refresh);
  $('calendar-export').addEventListener('click', () => run(async () => {
    records = await store.list();
    const json = serializeBackup(records);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = node('a');
    link.href = url;
    link.download = 'timecue-history-' + localDateKey() + '.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message('Exported ' + records.length + ' sessions. Keep the JSON file as a backup.');
  }));

  $('calendar-import').addEventListener('click', () => { pickingFile = true; });
  $('calendar-import').addEventListener('cancel', () => { pickingFile = false; });
  $('calendar-import').addEventListener('change', event => {
    pickingFile = false;
    const file = event.target.files[0];
    event.target.value = '';
    if (!file || busy) return;
    run(async () => {
      const imported = parseBackup(await file.text());
      records = await store.list();
      const ids = new Set(records.map(record => record.id));
      const skipped = imported.filter(record => ids.has(record.id)).length;
      pendingImport = imported;
      $('calendar-import-error').hidden = true;
      $('calendar-import-description').textContent = imported.length + ' sessions in this backup. ' + (imported.length - skipped) + ' new; ' + skipped + ' already saved. Existing session IDs will be skipped, without replacing your records.';
      $('calendar-import-dialog').showModal();
    });
  });
  $('calendar-import-confirm').addEventListener('click', () => {
    if (!pendingImport || busy) return;
    const imported = pendingImport;
    run(async () => {
      const result = await store.importRecords(imported);
      records = await store.list();
      pendingImport = null;
      $('calendar-import-dialog').close();
      if (imported.length) { selected = imported[0].date; month = selected.slice(0, 7); }
      message('Imported ' + result.added + ' sessions; skipped ' + result.skipped + ' existing sessions.');
    });
  });
  $('calendar-import-cancel').addEventListener('click', () => { pendingImport = null; $('calendar-import-dialog').close(); });
  $('calendar-import-dialog').addEventListener('cancel', event => {
    if (busy) event.preventDefault();
    else pendingImport = null;
  });
  window.addEventListener('focus', () => { if (!busy && !pickingFile && !$('calendar-import-dialog').open) refresh(); });
  // Let the caller finish initializing before notifying it.
  queueMicrotask(refresh);
  return { setSession, isSaved, get busy() { return busy; } };
}
