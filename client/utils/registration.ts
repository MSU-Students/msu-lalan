import type { RegisterPayload } from '../types';

export interface RegistrationForm extends RegisterPayload {
  confirmPassword: string;
}

export type RegistrationErrors = Partial<Record<keyof RegistrationForm, string>>;

// Mirrors the backend RegisterDto rules (api/src/modules/auth/dto/register.dto.ts).
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

// Counts UTF-8 bytes without TextEncoder (not available in every test/runtime environment).
export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0) as number;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration(form: RegistrationForm): RegistrationErrors {
  const errors: RegistrationErrors = {};

  const email = form.email.trim();
  if (!email) {
    errors.email = 'Email is required.';
  } else if (email.length > 255 || !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!form.firstName.trim()) {
    errors.firstName = 'First name is required.';
  } else if (form.firstName.trim().length > 100) {
    errors.firstName = 'First name must be 100 characters or fewer.';
  }

  if (!form.lastName.trim()) {
    errors.lastName = 'Last name is required.';
  } else if (form.lastName.trim().length > 100) {
    errors.lastName = 'Last name must be 100 characters or fewer.';
  }

  if (form.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  } else if (utf8ByteLength(form.password) > PASSWORD_MAX_BYTES) {
    errors.password = 'Password is too long (maximum 72 bytes).';
  } else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
    errors.password = 'Password must include at least one letter and one number.';
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}
