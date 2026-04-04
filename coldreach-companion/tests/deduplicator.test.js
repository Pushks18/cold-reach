const { isDuplicate, buildUpsertPayload } = require('../src/deduplicator');

test('isDuplicate: true if email matches existing', () => {
  const existing = [{ email: 'jane@stripe.com', linkedin_url: null }];
  expect(isDuplicate({ email: 'jane@stripe.com' }, existing)).toBe(true);
});

test('isDuplicate: true if linkedin_url matches', () => {
  const existing = [{ email: null, linkedin_url: 'https://linkedin.com/in/jane' }];
  expect(isDuplicate({ linkedin_url: 'https://linkedin.com/in/jane' }, existing)).toBe(true);
});

test('isDuplicate: false if no match', () => {
  const existing = [{ email: 'bob@stripe.com', linkedin_url: null }];
  expect(isDuplicate({ email: 'jane@stripe.com' }, existing)).toBe(false);
});

test('isDuplicate: false if existing is empty', () => {
  expect(isDuplicate({ email: 'jane@stripe.com' }, [])).toBe(false);
});

test('buildUpsertPayload strips undefined fields', () => {
  const contact = { name: 'Jane', email: undefined, title: 'Recruiter' };
  const result = buildUpsertPayload(contact);
  expect(result).toEqual({ name: 'Jane', title: 'Recruiter' });
});

test('buildUpsertPayload strips null fields', () => {
  const contact = { name: 'Jane', email: null, title: 'Recruiter' };
  const result = buildUpsertPayload(contact);
  expect(result).toEqual({ name: 'Jane', title: 'Recruiter' });
});

test('buildUpsertPayload strips empty string fields', () => {
  const contact = { name: 'Jane', email: '', title: 'Recruiter' };
  const result = buildUpsertPayload(contact);
  expect(result).toEqual({ name: 'Jane', title: 'Recruiter' });
});
