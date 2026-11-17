import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCurrentDate } from '../lib/date-format.mjs';

test('формирует дату как год, месяц прописью и день месяца', () => {
  const date = new Date(2026, 10, 17);

  assert.equal(formatCurrentDate(date), '2026 ноябрь 17');
});
