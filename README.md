# Voice Timer

A simple English-speaking stopwatch. Choose an interval, press Start, and hear your elapsed time without watching the clock.

**Live app:** https://omegazhang3.github.io/voice-timer/

## Features

- Count up with English voice announcements (for example, “1 minute 30 seconds elapsed”).
- 10, 30, and 60-second presets, or any whole-number interval from 5 to 3,600 seconds.
- Start, pause, resume, and stop; final time stays visible until you start again or leave/reload the page.
- Pauses do not count toward elapsed time. Interval settings are locked during a session.
- Test voice before starting. Start and resume also speak a short confirmation.
- Remembers your interval in browser storage; no account or backend.
- Responsive layout for phones and desktops.

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

Tests cover interval boundaries, pause/resume, delayed updates, stop/restart, interval validation, and English time formatting.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` runs the tests and deploys only the five static app files on every push to `main`. Repository Settings → Pages → Source must be set to **GitHub Actions**.

## Speech and timing

Speech uses the browser’s Web Speech API with an English voice from the device. Available voices, audio quality, and whether speech needs a network connection depend on the browser and speech provider. This app does not request microphone access. If speech is unavailable, it explains the issue and the stopwatch still works.

Elapsed time is calculated from a monotonic timestamp, not by counting ticks. Delayed updates announce the current elapsed time once instead of replaying missed intervals. Pausing or stopping cancels speech.

This first version focuses on foreground timing. Background/lock-screen announcements, keeping the display awake, PWA installation, and voice commands are outside its scope. Reloading or closing the page ends the session; only the interval preference is persisted.
