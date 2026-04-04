const { parseSmtpResponse, buildMxDomain } = require('../src/smtp-verifier');

test('parseSmtpResponse: 250 is valid', () => {
  expect(parseSmtpResponse('250 OK')).toBe(true);
});

test('parseSmtpResponse: 250 with details is valid', () => {
  expect(parseSmtpResponse('250 2.1.5 OK')).toBe(true);
});

test('parseSmtpResponse: 550 is invalid', () => {
  expect(parseSmtpResponse('550 No such user')).toBe(false);
});

test('parseSmtpResponse: 451 is unknown (returns false)', () => {
  expect(parseSmtpResponse('451 Try again later')).toBe(false);
});

test('parseSmtpResponse: empty string is false', () => {
  expect(parseSmtpResponse('')).toBe(false);
});

test('buildMxDomain extracts domain from email', () => {
  expect(buildMxDomain('john@stripe.com')).toBe('stripe.com');
});

test('buildMxDomain handles subdomain emails', () => {
  expect(buildMxDomain('john@mail.stripe.com')).toBe('mail.stripe.com');
});
