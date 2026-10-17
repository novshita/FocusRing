import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalRepo } from '../js/localRepo.js';
import { memoryStore, brokenStore } from './memoryStore.js';

describe('profile', () => {
  test('is empty before anything is saved', async () => {
    const repo = createLocalRepo(memoryStore());
    assert.deepEqual(await repo.getProfile(), { name: '', bio: '', avatar: '' });
  });

  test('saves and reads back each field', async () => {
    const repo = createLocalRepo(memoryStore());
    assert.equal(await repo.saveProfile({ name: 'Nova', bio: 'Focus!', avatar: 'data:image/png;base64,AAA' }), true);
    assert.deepEqual(await repo.getProfile(), { name: 'Nova', bio: 'Focus!', avatar: 'data:image/png;base64,AAA' });
  });

  test('saving one field leaves the others alone', async () => {
    const repo = createLocalRepo(memoryStore());
    await repo.saveProfile({ name: 'Nova', bio: 'Hi' });
    await repo.saveProfile({ bio: 'Updated' });
    const profile = await repo.getProfile();
    assert.equal(profile.name, 'Nova');
    assert.equal(profile.bio, 'Updated');
  });

  test('an empty string removes the field', async () => {
    const store = memoryStore();
    const repo = createLocalRepo(store);
    await repo.saveProfile({ avatar: 'data:image/png;base64,AAA' });
    await repo.saveProfile({ avatar: '' });
    assert.equal((await repo.getProfile()).avatar, '');
    assert.equal(store.data.has('focusring_profile_avatar'), false);
  });

  test('reads data saved before the repo existed (legacy keys)', async () => {
    const repo = createLocalRepo(memoryStore({
      focusring_profile_name: 'Old Name',
      focusring_profile_bio: 'Old bio',
      focusring_profile_avatar: 'data:image/png;base64,OLD'
    }));
    assert.deepEqual(await repo.getProfile(), { name: 'Old Name', bio: 'Old bio', avatar: 'data:image/png;base64,OLD' });
  });

  test('reports failure when storage is full', async () => {
    const repo = createLocalRepo(brokenStore());
    assert.equal(await repo.saveProfile({ avatar: 'x' }), false);
  });
});

describe('settings and appearance', () => {
  test('patchSettings merges instead of replacing', async () => {
    const repo = createLocalRepo(memoryStore());
    await repo.patchSettings({ workMins: '25' });
    await repo.patchSettings({ soundEnabled: false });
    assert.deepEqual(await repo.getSettings(), { workMins: '25', soundEnabled: false });
  });

  test('keeps existing stored settings when patching', async () => {
    const repo = createLocalRepo(memoryStore({ focusring_settings: '{"catId":"ocean"}' }));
    await repo.patchSettings({ imgIdx: 2 });
    assert.deepEqual(await repo.getSettings(), { catId: 'ocean', imgIdx: 2 });
  });

  test('corrupt stored JSON falls back to defaults instead of throwing', async () => {
    const repo = createLocalRepo(memoryStore({ focusring_settings: '{not json' }));
    assert.deepEqual(await repo.getSettings(), {});
  });

  test('appearance round-trips and is empty when unset', async () => {
    const repo = createLocalRepo(memoryStore());
    assert.equal(await repo.getAppearance(), '');
    await repo.saveAppearance('light');
    assert.equal(await repo.getAppearance(), 'light');
  });

  test('reads fall back to defaults when storage is blocked', async () => {
    const repo = createLocalRepo(brokenStore());
    assert.deepEqual(await repo.getSettings(), {});
    assert.equal(await repo.getAppearance(), '');
    assert.deepEqual(await repo.getProfile(), { name: '', bio: '', avatar: '' });
    assert.equal(await repo.patchSettings({ a: 1 }), false);
  });
});

describe('journey', () => {
  const at = (h, d = 18) => new Date(2026, 9, d, h, 0);

  test('starts empty', async () => {
    const repo = createLocalRepo(memoryStore());
    assert.deepEqual(await repo.getJourney(), { history: {}, flags: {} });
  });

  test('recordSession aggregates sessions into the day', async () => {
    const repo = createLocalRepo(memoryStore());
    assert.equal(await repo.recordSession(25, at(10)), true);
    await repo.recordSession(30, at(14));
    const { history } = await repo.getJourney();
    assert.deepEqual(history, { '2026-10-18': { m: 55, n: 2 } });
  });

  test('stamps early and night flags from the time the session ended', async () => {
    const repo = createLocalRepo(memoryStore());
    await repo.recordSession(25, at(6));
    assert.deepEqual((await repo.getJourney()).flags, { early: true });
    await repo.recordSession(25, at(23, 19));
    assert.deepEqual((await repo.getJourney()).flags, { early: true, night: true });
  });

  test('a midday session sets no flags', async () => {
    const repo = createLocalRepo(memoryStore());
    await repo.recordSession(25, at(12));
    assert.deepEqual((await repo.getJourney()).flags, {});
  });

  test('keeps history saved before the repo existed (legacy keys)', async () => {
    const repo = createLocalRepo(memoryStore({
      focusring_history: '{"2026-10-17":{"m":40,"n":2}}',
      focusring_badge_flags: '{"early":true}'
    }));
    await repo.recordSession(25, at(12));
    const { history, flags } = await repo.getJourney();
    assert.deepEqual(history['2026-10-17'], { m: 40, n: 2 });
    assert.deepEqual(history['2026-10-18'], { m: 25, n: 1 });
    assert.deepEqual(flags, { early: true });
  });

  test('recordSession reports failure when the write does not stick', async () => {
    const repo = createLocalRepo(brokenStore());
    assert.equal(await repo.recordSession(25, at(12)), false);
  });
});
