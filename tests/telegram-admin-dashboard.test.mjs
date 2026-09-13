import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dashboardKeyboard,
  dashboardSnapshot,
  formatDashboard,
  releaseRecentPendingOffers,
} from '../scripts/telegram-admin-dashboard.mjs';

const now = new Date('2026-09-13T18:30:00Z');

test('builds the private dashboard from real queue and publication fields', () => {
  const snapshot = dashboardSnapshot({
    now,
    offers: [
      { store: 'Amazon', date: Date.parse('2026-09-13T10:00:00Z') / 1000 },
      { store: 'AliExpress', date: Date.parse('2026-09-13T11:00:00Z') / 1000 },
      { store: 'Amazon', date: Date.parse('2026-09-12T10:00:00Z') / 1000 },
    ],
    queue: { items: [
      { status: 'pending' },
      { status: 'pending', nextAttemptAt: '2026-09-13T20:00:00Z' },
      { status: 'rejected', store: 'Miravia', reason: 'Falta foto', updatedAt: '2026-09-13T17:00:00Z' },
      { status: 'duplicate', updatedAt: '2026-09-13T17:00:00Z' },
    ] },
    report: { updatedAt: '2026-09-13T18:25:00Z' },
    states: { aliexpress: { healthy: true }, amazon: { lastError: 'eligibility requirements' } },
  });
  assert.equal(snapshot.publishedToday, 2);
  assert.equal(snapshot.byStore.Amazon, 1);
  assert.equal(snapshot.byStore.AliExpress, 1);
  assert.equal(snapshot.ready, 1);
  assert.equal(snapshot.waiting, 1);
  assert.equal(snapshot.rejectedToday, 1);
  assert.equal(snapshot.duplicateToday, 1);
  assert.match(formatDashboard(snapshot, 'home', now), /Publicadas hoy: 2/u);
  assert.match(formatDashboard(snapshot, 'stores', now), /Amazon: pendiente de aprobación API/u);
  assert.match(formatDashboard(snapshot, 'errors', now), /Miravia: Falta foto/u);
  const keyboard = dashboardKeyboard(snapshot);
  assert.equal(keyboard.inline_keyboard[0][0].text, '📥 COLA · 2');
  assert.equal(keyboard.inline_keyboard[0][1].text, '📊 HOY · 2');
  assert.equal(keyboard.inline_keyboard[2][0].callback_data, 'dashboard:refresh');
  assert.equal(keyboard.inline_keyboard[3][0].callback_data, 'dashboard:retry');
  assert.deepEqual(dashboardKeyboard(snapshot, 'queue').inline_keyboard[0].map((button) => button.callback_data), [
    'dashboard:home', 'dashboard:queue',
  ]);
});

test('manual retry only releases recent pending offers and never published items', () => {
  const queue = { items: [
    { id: 'new', status: 'pending', publishedAt: '2026-09-13T18:00:00Z', nextAttemptAt: '2026-09-13T22:00:00Z' },
    { id: 'old', status: 'pending', publishedAt: '2026-09-01T18:00:00Z', nextAttemptAt: '2026-09-13T22:00:00Z' },
    { id: 'done', status: 'published', publishedAt: '2026-09-13T18:00:00Z', nextAttemptAt: '2026-09-13T22:00:00Z' },
  ] };
  assert.equal(releaseRecentPendingOffers(queue, now), 1);
  assert.equal('nextAttemptAt' in queue.items[0], false);
  assert.equal(queue.items[0].reason, 'Reintento solicitado desde el panel privado');
  assert.equal(queue.items[1].nextAttemptAt, '2026-09-13T22:00:00Z');
  assert.equal(queue.items[2].status, 'published');
});
