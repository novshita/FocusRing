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
├── index.html          # markup
├── style.css           # styling and themes
├── js/
│   ├── main.js         # starts each feature
│   ├── timer.js        # countdown and session cycle
│   ├── journey.js      # stats, heatmap, growth rings, badges (rendering)
│   ├── profile.js      # name, bio, photo
│   ├── themes.js       # wallpapers and appearance
│   ├── sharecard.js    # exports the growth rings as an image
│   ├── stats.js        # pure logic: streaks, totals, ring geometry
│   ├── badges.js       # achievement rules
│   ├── localRepo.js    # async data layer (localStorage)
│   └── repo.js         # picks which data layer the app uses
├── tests/              # unit tests
└── package.json        # only used to run the tests
```

The UI never touches storage directly. It goes through `repo.js`, so the data layer can be swapped for a hosted backend without changing the UI.

## Tests

```
npm test
```

Uses Node's built-in test runner, so there is nothing to install. The tests cover the streak and ring logic (including daylight-saving edge cases), the badge rules, and the data layer, including reading data saved by earlier versions and behaving when storage is full or blocked. They run in CI on every push and pull request.

## Roadmap / ideas

- [ ] Browser notifications when a session ends
- [ ] Persist timer state across page refresh
- [ ] Keyboard shortcuts (space to start/pause, R to reset)

## License

MIT
