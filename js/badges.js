// Achievement definitions. `done` and `have` read the object returned by
// journeyStats() in stats.js; badges with a `goal` also show progress while locked.
export const BADGES = [
  { emoji: '🌱', name: 'First Focus', need: 'Finish your first session',
    done: s => s.totalSessions >= 1, have: s => s.totalSessions, goal: 1 },
  { emoji: '🎯', name: 'Finding Rhythm', need: 'Finish 5 sessions',
    done: s => s.totalSessions >= 5, have: s => s.totalSessions, goal: 5 },
  { emoji: '🏅', name: 'Committed', need: 'Finish 25 sessions',
    done: s => s.totalSessions >= 25, have: s => s.totalSessions, goal: 25 },
  { emoji: '🔥', name: 'Three in a Row', need: 'Focus 3 days running',
    done: s => s.bestStreak >= 3, have: s => s.bestStreak, goal: 3 },
  { emoji: '⚡', name: 'Week Warrior', need: 'Focus 7 days running',
    done: s => s.bestStreak >= 7, have: s => s.bestStreak, goal: 7 },
  { emoji: '🧠', name: 'Deep Work', need: '2 hours in a single day',
    done: s => s.bestDay >= 120, have: s => Math.floor(s.bestDay / 60), goal: 2 },
  { emoji: '⏳', name: 'Ten Hours Deep', need: '10 hours focused in total',
    done: s => s.totalMinutes >= 600, have: s => Math.floor(s.totalMinutes / 60), goal: 10 },
  { emoji: '🌅', name: 'Early Riser', need: 'Finish a session before 8am',
    done: s => !!s.flags.early },
  { emoji: '🦉', name: 'Night Owl', need: 'Finish a session after 11pm',
    done: s => !!s.flags.night }
];
