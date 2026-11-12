# TimeCue

[English](README.md) | [简体中文](README.zh-CN.md)

A talking workout timer that helps you focus on your movement without repeatedly checking the screen. Useful for jump rope, dead hangs, planks, stretching, and other timed activities. The current version has an English interface and English voice announcements.

**Live app:** https://omegazhang3.github.io/voice-timer/

## Feature highlights

- **Hear your progress:** Announce elapsed time at a preset or custom interval. Short announcements say just “5 seconds”, “10 seconds”, and so on.
- **Get ready before timing starts:** Choose a spoken 3, 5, or 10-second countdown, or start immediately. The default is 3 seconds.
- **Control your workout:** Start, pause, resume, and stop. Preparation countdowns and pauses are excluded from elapsed time.
- **Organize training into sessions and sets:** Name a session after your activity and manually save each stopped interval as a set.
- **Quickly correct a set’s duration:** Decrease to the previous multiple of five seconds (47 → 45 → 40), or add one second at a time. Adjustments never exceed the measured duration.
- **Review your session:** See the number of saved sets, each set’s duration, and the total training time.
- **Open and use:** Works in a phone or desktop browser without installation or registration. Session records stay in page memory and are cleared on reload; timer preferences are remembered separately.

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

Create a session with any name (including Chinese), or press Start to create one automatically using the entered name or the current date and time. Stop each timing interval, optionally adjust **Set duration** with the **− / +1** buttons, then press **Save set** to add it to the session. For example, a measured 20-second set can be reduced to 15 seconds and increased back up to 20, but never beyond 20. The original stopwatch time remains visible; the saved value is used in the session total. A stopped time is not included in totals until saved, and the same stopped time cannot be saved twice.

Use **Next set** to start again with the same announcement and countdown settings. If a stopped set is unsaved, starting another set or finishing the session asks whether to save it, discard it, or keep editing. **Delete** removes an incorrectly saved set while the session is active.

Stop timing before selecting **Finish session**. The summary shows every saved set, the set count, and their combined duration. Set duration defaults to the complete seconds shown on the stopwatch. The decrease button jumps to the previous multiple of five seconds (47 → 45 → 40, or 41 → 40). The increase button adds one second at a time, up to the original measured duration. Buttons are disabled if the next step would exceed the measured time or fall below one second. Sets of five seconds or less keep their original duration. Measurements under one second do not create a pending set. Startup countdowns, pauses, rest between sets, and discarded sets do not count toward the total.

Session data lives only in page memory: there is no history database, local storage, or server upload for session records. Refreshing or closing the page clears the session. The browser is asked to warn before leaving a session, but some mobile browsers do not display that warning. Starting a new session clears the previous summary after confirmation when it contains saved sets. Timer preferences continue to be saved separately.

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

Tests cover interval boundaries, pause/resume, delayed updates, stop/restart, startup countdowns and cancellation, input validation, English time formatting, and loading the correct speech formatter when an older module is cached.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` runs tests and builds the static site with `npm run build` on every push to `main`. Repository Settings → Pages → Source must be set to **GitHub Actions**.

The build gives JavaScript, CSS, and icons content-based filenames in `dist/`. The app also imports the matching version of the timer module, preventing an updated interface from using a cached older speech formatter. The source files can still be served directly for local development.

## Speech and timing

Speech uses the browser’s Web Speech API with an English voice from the device. Available voices, audio quality, and whether speech needs a network connection depend on the browser and speech provider. This app does not request microphone access. If speech is unavailable, it explains the issue and the stopwatch still works.

Elapsed time is calculated from a monotonic timestamp, not by counting ticks. Delayed updates announce the current elapsed time once instead of replaying missed intervals. Pausing or stopping cancels speech.

This first version focuses on foreground timing. Background/lock-screen announcements, keeping the display awake, PWA installation, and voice commands are outside its scope. Reloading or closing the page ends the session; only interval, start-delay, and announcement-mode preferences are persisted.
