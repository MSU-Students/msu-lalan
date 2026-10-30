import { utf8ByteLength, validateRegistration, type RegistrationForm } from '../../utils/registration';

const validForm: RegistrationForm = {
  email: 'guest@example.com',
  password: 'Campus123',
  confirmPassword: 'Campus123',
  firstName: 'Fatima',
  lastName: 'Alawi',
};

describe('validateRegistration', () => {
  it('accepts a valid form', () => {
    expect(validateRegistration(validForm)).toEqual({});
  });

  it('requires every field', () => {
    const errors = validateRegistration({
      email: '',
      password: '',
      confirmPassword: '',
      firstName: ' ',
      lastName: '',
    });
    expect(Object.keys(errors).sort()).toEqual(
      ['confirmPassword', 'email', 'firstName', 'lastName', 'password'].sort(),
    );
  });

  it.each(['plainaddress', 'missing@tld', 'two@@example.com', 'spaces in@example.com'])(
    'rejects invalid email %s',
    (email) => {
      expect(validateRegistration({ ...validForm, email }).email).toBeDefined();
    },
  );

  it('accepts an email with surrounding whitespace (it is trimmed on submit)', () => {
    expect(validateRegistration({ ...validForm, email: '  guest@example.com ' }).email).toBeUndefined();
  });

  it('enforces password length, letter and number rules', () => {
    expect(validateRegistration({ ...validForm, password: 'Ab1', confirmPassword: 'Ab1' }).password).toMatch(
      /at least 8/,
    );
    expect(
      validateRegistration({ ...validForm, password: 'onlyletters', confirmPassword: 'onlyletters' }).password,
    ).toMatch(/letter and one number/);
    expect(
      validateRegistration({ ...validForm, password: '12345678', confirmPassword: '12345678' }).password,
    ).toMatch(/letter and one number/);
  });

  it('rejects passwords above 72 bytes, counting multi-byte characters', () => {
    const longAscii = 'A1' + 'a'.repeat(71);
    expect(validateRegistration({ ...validForm, password: longAscii, confirmPassword: longAscii }).password).toMatch(
      /too long/,
    );
    const emoji = 'A1' + '😀'.repeat(20); // 22 characters but 82 bytes
    expect(validateRegistration({ ...validForm, password: emoji, confirmPassword: emoji }).password).toMatch(
      /too long/,
    );
  });

  it('requires matching confirmation', () => {
    expect(validateRegistration({ ...validForm, confirmPassword: 'Different123' }).confirmPassword).toBe(
      'Passwords do not match.',
    );
  });
});

describe('utf8ByteLength', () => {
  it('counts bytes per UTF-8 code point', () => {
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('é')).toBe(2);
    expect(utf8ByteLength('€')).toBe(3);
    expect(utf8ByteLength('😀')).toBe(4);
  });
});
