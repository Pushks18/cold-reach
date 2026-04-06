const { extractNameParts } = require('../src/pipeline');

test('extractNameParts splits full name into first and last', () => {
  expect(extractNameParts('Jane Smith')).toEqual({ first: 'Jane', last: 'Smith' });
});

test('extractNameParts handles single name', () => {
  expect(extractNameParts('Madonna')).toEqual({ first: 'Madonna', last: '' });
});

test('extractNameParts handles extra whitespace', () => {
  expect(extractNameParts('  John   Doe  ')).toEqual({ first: 'John', last: 'Doe' });
});

test('extractNameParts handles three-word name', () => {
  expect(extractNameParts('Mary Jane Watson')).toEqual({ first: 'Mary', last: 'Jane Watson' });
});

test('extractNameParts returns empty strings for empty input', () => {
  expect(extractNameParts('')).toEqual({ first: '', last: '' });
});
