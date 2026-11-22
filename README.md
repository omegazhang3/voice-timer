# TimeCue

[English](README.md) | [简体中文](README.zh-CN.md)

A talking workout timer that helps you focus on your movement without repeatedly checking the screen. Useful for jump rope, dead hangs, planks, stretching, and other timed activities. The current version has an English interface and English voice announcements.

**Live app:** https://omegazhang3.github.io/voice-timer/

**Planned features:** [TimeCue TODO (Chinese)](TODO.md), starting with voice-controlled Start / Stop.

## Feature highlights

- **Hear your progress:** Announce elapsed time at a preset or custom interval. Short announcements say just “5 seconds”, “10 seconds”, and so on.
- **Get ready before timing starts:** Choose a spoken 3, 5, or 10-second countdown, or start immediately. The default is 3 seconds.
- **Control your workout:** Start, pause, resume, and stop. Preparation countdowns and pauses are excluded from elapsed time.
- **Track rest between sets:** A separate Rest time display counts up after Stop and continues through saving, editing, and the next preparation countdown. Rest never affects the main timer, voice intervals, or training totals.
- **Organize training into sessions and sets:** Name a session after your activity and manually save each stopped interval as a set.
- **Record reps for strength exercises:** Choose **Reps** for bench press, squats, or similar exercises, then enter the completed count before Save set. Timed durations and reps have separate totals.
- **Quickly correct a set’s duration:** Decrease to the previous multiple of five seconds (47 → 45 → 40), or add one second at a time. Adjustments never exceed the measured duration.
- **Review your session:** Saved sets and the final summary show each set’s duration and **Rest after** interval. Rest is automatically recorded on the preceding set when the next set starts, and stays separate from total training time.
- **Training calendar and backups:** Save completed sessions to a date, browse daily results and set details, and export/import JSON backups. Saved history stays in this browser using IndexedDB.
- **Open and use:** Works in a phone or desktop browser without installation or registration. Current sessions remain temporary until you choose Save to calendar; timer preferences are remembered separately.

## Timing and voice options

- Count up with English voice announcements (for example, “1 minute 30 seconds elapsed”).
- 5, 10, 30, and 60-second presets, or any whole-number interval from 5 to 3,600 seconds.
- Optional **Short announcements** speaks only cumulative seconds: “5 seconds”, “10 seconds”, “65 seconds”, without “elapsed”. Switch it at any time; Test voice previews the selected mode and interval.
- Start, pause, resume, and stop; final time stays visible until you start again or leave/reload the page.
- **Start delay**: Off, 3, 5, or 10 seconds (default: 3). A large spoken countdown runs before each fresh start, then “Go!” marks the start of the stopwatch. Cancel it at any time; countdown time is excluded from elapsed time and announcement intervals. Resume continues immediately without a countdown.
- Pauses do not count toward elapsed time. Interval settings are locked while the timer is active.
- Test voice before starting. Starting without a delay and resuming speak a short confirmation.
- Remembers your interval, start delay, and announcement mode in browser storage; no account or backend.
- Responsive layout for phones and desktops.

## Sessions and sets

Create a session with any name (including Chinese), or press Start to create one automatically using the entered name or the current date and time. In **Time** mode, stop each timing interval, optionally adjust **Set duration** with the **− / +1** buttons, then press **Save set** to add it to the session. For example, a measured 20-second set can be reduced to 15 seconds and increased back up to 20, but never beyond 20. The original stopwatch time remains visible; the saved value is used in the session total. A stopped set is not included in totals until saved, and the same set cannot be saved twice.

Use **Next set** to start again with the same announcement and countdown settings. If a stopped set is unsaved, starting another set or finishing the session asks whether to save it, discard it, or keep editing. **Delete** removes an incorrectly saved set while the session is active.

Stop timing before selecting **Finish session**. The summary shows every saved set, the set count, and their combined duration. Set duration defaults to the complete seconds shown on the stopwatch. The decrease button jumps to the previous multiple of five seconds (47 → 45 → 40, or 41 → 40). The increase button adds one second at a time, up to the original measured duration. Buttons are disabled if the next step would exceed the measured time or fall below one second. Sets of five seconds or less keep their original duration. In Time mode, measurements under one second do not create a pending set. Startup countdowns, pauses, rest between sets, and discarded sets do not count toward the total.

The current session stays in page memory until you finish it and choose **Save to calendar**. Save set and Finish session alone do not persist it. Refreshing or closing the page clears the current session, while calendar history remains in IndexedDB. The browser is asked to warn before leaving a session that has not been saved to the calendar; some mobile browsers do not show this warning. Starting a new session asks for confirmation if the previous session contains sets that were not saved to the calendar. It never clears calendar history. Timer preferences are saved separately.

## Reps for strength exercises

For exercises measured by count, such as bench press:

1. Set **Record set as** to **Reps**. You can also switch a stopped, unsaved set from Time to Reps.
2. Use Start and Stop as usual to mark the set boundaries and preserve accurate rest intervals. The recording type is locked during countdowns, running, and pauses.
3. After Stop, enter **Reps completed**, such as `8`, then click **Save set**. Enter a positive whole number; blank, zero, negative, and fractional counts cannot be saved.

Reps mode keeps the preparation countdown and start/resume voice confirmations, but disables elapsed-time announcements. The stopwatch remains visible for reference; its duration is not included in the saved timed-set total. Each new set starts with an empty reps field, and the count is independent of measured seconds. Time mode retains its existing duration adjustment rules.

Saved sets show **8 reps** in the **Result** column, alongside **Rest after**. A session may contain both timed and rep-based sets: an 8-rep set, a 20-second set, and a 10-rep set produce **3 sets**, **00:20 timed sets**, and **18 total reps**. A reps-only session displays total reps in the large final summary. Save/discard prompts and deletion work for both types. Recording type lasts for the current page visit. Save completed sessions to the calendar to retain reps and other set details after reloading.

## Rest between sets

After stopping a set, **Rest time** automatically counts up in a separate display while the final workout time remains visible. Saving, editing, deleting, or discarding a set does not reset the rest clock. It also keeps running while a save/discard dialog is open.

Rest ends when the next set actually starts, so the next preparation countdown is included in rest time. Cancelling that countdown keeps the same rest period running. There is no rest timer before the first set, and pausing within a set does not start one. Each Stop after timing starts begins a new rest period. Finishing the session clears the rest display; a new session starts fresh.

Rest is displayed visually without voice announcements. It does not change workout announcement intervals and is excluded from set durations and session totals.

The **Rest after** column in Saved sets and the session summary records each completed interval on the preceding set: if Set 2 starts 10 seconds after Set 1 stops, Set 1 shows **00:10**. The interval is finalized automatically when the next set actually starts, including preparation countdowns and time spent saving or editing. Editing the set duration does not change the rest start time. Until the next set starts, the column shows **—**; finishing the session leaves the final set without a following interval. Intervals under one second show **00:00**. Deleting or discarding a set also removes its associated rest record; intervals are not reassigned or merged into another set.

For example, save a 20-second Set 1, start Set 2 after a 10-second rest, then save a 15-second Set 2 and finish the session:

| Set | Duration | Rest after |
| --- | --- | --- |
| Set 1 | 00:20 | 00:10 |
| Set 2 | 00:15 | — |

The summary shows **2 sets** and **00:35 total time**. The 10-second rest is recorded on Set 1 and excluded from the total. Set durations are saved manually; completed rest intervals are attached automatically without pressing Save set again. Choose Save to calendar after finishing the session to retain these records, including rest intervals.

## Training calendar and JSON backups

1. Complete your sets and choose **Finish session**.
2. Review **Training date**, then choose **Save to calendar**. The default is the session's start date in the local time zone, including sessions finished after midnight. You can choose another date for backdated records. Empty sessions cannot be saved.
3. Use the month arrows or **Today**, then select a day. Dates with saved sessions show a dot and session count. Expand a session to see each set's result, measured duration, and Rest after interval. Daily and session totals keep timed durations and reps separate.

Saving the same completed session again uses its existing ID, so it does not create duplicates. While the completed session is still open, changing Training date and choosing **Update calendar date** moves that record. **Delete session** removes a calendar record after confirmation. Calendar actions do not change the current timer or its sets.

**Export JSON** downloads all calendar sessions. **Import JSON** accepts TimeCue version 1 backups and previews how many sessions are new or already saved before confirmation. Import skips existing session IDs, including those with different contents; it never replaces them. Files are validated in full before writing, and all new records are imported in one transaction. Invalid files or failed writes leave existing history intact. Export includes the format version, stable session IDs, names, assigned dates, start/save timestamps, original time zones, and complete set details. Totals are calculated from those details. Assigned dates stay the same when importing in another time zone.

History is stored locally in **IndexedDB**, without an account, backend, or upload to GitHub. It belongs to this browser/profile and website origin; a different browser, device, or site domain has separate storage. Clearing site data or private-browsing storage can remove it, and browsers may reclaim storage. Keep JSON backups for recovery or transfer. Calendar storage errors are shown with **Retry / refresh**; the stopwatch and current session still work when history storage is unavailable. There is no automatic saving of unfinished sessions or cloud sync.

## Local use

Serve this directory with a static HTTP server, for example:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://localhost:8000. Use HTTP/HTTPS rather than opening `index.html` directly, because the app uses JavaScript modules. No dependency installation or build step is required.

## Test

With Node.js 20 or newer:

```sh
npm test
```

Tests cover interval boundaries, pause/resume, delayed updates, stop/restart, startup countdowns and cancellation, input validation, calendar record validation and JSON round trips, reps and mixed-session totals, switching recording types, independent rest timing, rest attribution to the preceding set, session totals, English time formatting, and loading the correct speech formatter when an older module is cached.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` runs tests and builds the static site with `npm run build` on every push to `main`. Repository Settings → Pages → Source must be set to **GitHub Actions**.

The build gives JavaScript, CSS, and icons content-based filenames in `dist/`. The app imports matching versions of its timer, session, calendar, and history modules, preventing updated interfaces from loading mismatched cached code. The source files can still be served directly for local development.

## Speech and timing

Speech uses the browser’s Web Speech API with an English voice from the device. Available voices, audio quality, and whether speech needs a network connection depend on the browser and speech provider. This app does not request microphone access. If speech is unavailable, it explains the issue and the stopwatch still works.

Elapsed time is calculated from a monotonic timestamp, not by counting ticks. Delayed updates announce the current elapsed time once instead of replaying missed intervals. Pausing or stopping cancels speech.

This version focuses on foreground timing. Background/lock-screen announcements, keeping the display awake, PWA installation, and voice commands are outside its scope. Reloading or closing the page ends the current session. Sessions explicitly saved to the calendar persist in IndexedDB; interval, start-delay, and announcement-mode preferences are stored separately.
