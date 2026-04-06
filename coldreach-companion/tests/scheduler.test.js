const { buildCronExpression, loadWatchlist } = require('../src/scheduler');

test('buildCronExpression: every 30 minutes', () => {
  expect(buildCronExpression(30)).toBe('*/30 * * * *');
});

test('buildCronExpression: every 120 minutes → every 2 hours', () => {
  expect(buildCronExpression(120)).toBe('0 */2 * * *');
});

test('buildCronExpression: every 60 minutes → every 1 hour', () => {
  expect(buildCronExpression(60)).toBe('0 */1 * * *');
});

test('buildCronExpression: 0 or negative returns null', () => {
  expect(buildCronExpression(0)).toBeNull();
  expect(buildCronExpression(-5)).toBeNull();
});

test('loadWatchlist: returns empty array if file missing', () => {
  const result = loadWatchlist();
  expect(Array.isArray(result)).toBe(true);
});
