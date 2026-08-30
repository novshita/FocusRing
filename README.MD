# FocusRing

A distraction-free focus timer with a circular kitchen-timer-style dial, customizable work and break durations, an audio chime when a session ends, and automatic long-break cycling every four sessions — built entirely with vanilla HTML, CSS, and JavaScript, no frameworks required.

Inspired by the [Pomodoro Technique](https://en.m.wikipedia.org/wiki/Pomodoro_Technique).

## Features

- **Work / break timer** — defaults to 25 minutes of work, 5 minutes of break
- **Start, Pause, Stop, and Reset** controls
- **Circular progress dial** that fills as each session counts down
- **Sound alert** when a session ends (no audio file — generated in-browser)
- **Customizable durations** — edit work, break, and long-break minutes before starting
- **Long-break cycling** — every 4th break automatically becomes a longer break, tracked by seed-shaped progress dots

## Getting started

1. Clone this repo:
   ```
   git clone https://github.com/YOUR-USERNAME/focusring.git
   ```
2. Open `index.html` in your browser — or use the VS Code "Live Server" extension for auto-reload while editing.

No build step, no dependencies, no npm install.

## Project structure

```
focusring/
├── index.html   # markup
├── style.css    # styling and theme
└── script.js    # timer logic
```

## Roadmap / ideas

- [ ] Browser notifications when a session ends
- [ ] Persist timer state across page refresh
- [ ] Keyboard shortcuts (space to start/pause, R to reset)

## License

MIT
