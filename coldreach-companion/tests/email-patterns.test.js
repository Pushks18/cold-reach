const { generatePatterns } = require('../src/email-patterns');

test('generates 7 patterns for a full name and domain', () => {
  const patterns = generatePatterns('John', 'Doe', 'stripe.com');
  expect(patterns).toEqual([
    'john.doe@stripe.com',
    'jdoe@stripe.com',
    'johndoe@stripe.com',
    'john_doe@stripe.com',
    'john@stripe.com',
    'doe.john@stripe.com',
    'j.doe@stripe.com',
  ]);
});

test('lowercases everything', () => {
  const patterns = generatePatterns('JANE', 'SMITH', 'ACME.COM');
  expect(patterns[0]).toBe('jane.smith@acme.com');
});

test('returns empty array if firstName missing', () => {
  expect(generatePatterns('', 'Doe', 'stripe.com')).toEqual([]);
});

test('returns empty array if lastName missing', () => {
  expect(generatePatterns('John', '', 'stripe.com')).toEqual([]);
});

test('returns empty array if domain missing', () => {
  expect(generatePatterns('John', 'Doe', '')).toEqual([]);
});
