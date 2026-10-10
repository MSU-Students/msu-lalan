# Guest Account Registration Implementation Plan

## Goal

Allow a visitor to create a guest account with email and password, receive a clear success confirmation, and subsequently sign in. Guest accounts must have fewer permissions than regular authenticated users.

## Repository Context

- The API is NestJS with class-validator enabled globally, TypeORM/PostgreSQL persistence, JWT authentication, and bcryptjs already installed.
- `POST /api/v1/auth/login` and password verification already exist. Login identifies its email field as `username`.
- User roles currently include `SUPER_ADMIN`, `CAMPUS_ADMIN`, and `GENERAL_USER`; there is no guest role or account-registration endpoint.
- The client has an auth store and Google OAuth callback, but no registration or password-login page.
- TypeORM `synchronize` defaults to enabled and no migration files were found in the API source tree. Production schema changes need an explicit migration/deployment decision.

## Requirements

- **REQ-001 Navigation:** A visitor can find and open registration from the app's unauthenticated entry and login experience.
- **REQ-002 Details and validation:** A visitor can submit email, password, and agreed profile fields; invalid or missing values are rejected with field-level feedback.
- **REQ-003 Account creation:** The API creates a unique account with a securely hashed password and guest status. Plaintext passwords are never stored or returned.
- **REQ-004 Guest permissions:** Guest accounts have a defined, enforceable permission set that excludes capabilities reserved for regular users and administrators.
- **REQ-005 Confirmation:** Successful account creation produces an unambiguous confirmation without exposing credentials or password hashes.
- **REQ-006 Login:** The visitor can use the newly registered email and password through the existing password-authentication flow and receive a usable authenticated session.

## Recommended Decisions and Open Questions

- Model `GUEST` as a distinct role, separate from `GENERAL_USER`. This matches the requirement that a guest has less access than an authenticated regular user. Define which existing and planned API actions guests may use before implementation; the current `RolesGuard` allows every authenticated role when no roles are declared.
- For the initial release, defer email verification unless product or deployment policy requires proof of email ownership. If verification is required, add a pending/unverified account state, token delivery/expiry, and a rule preventing login until verification completes; do not silently treat `isActive` as verified without an explicit policy.
- Registration should return a safe success response and direct the visitor to login, rather than issuing a session implicitly. This keeps the confirmation and login acceptance criteria independently testable.
- Confirm required profile fields and the password minimum with the product owner. Keep registration and login validation consistent, including bcrypt's 72-byte input limit.

## Implementation Tasks

- [ ] **T1 - Define account and permission policy** (REQ-003, REQ-004): Confirm guest-allowed actions, required profile fields, password rules, and verification policy. Add `GUEST` to backend and client role types. Add/update the database enum through a TypeORM migration for persistent environments; document the local auto-sync behavior and rollout order. Preserve existing roles and accounts.
- [ ] **T2 - Implement registration API** (REQ-002, REQ-003, REQ-005): Add a registration DTO with allowlisted, validated fields and API documentation. Add `POST /api/v1/auth/register`; normalize email consistently, reject duplicate addresses, hash the password with bcryptjs, derive institutional-email status using the existing helper, assign `GUEST` server-side, and return only a safe confirmation/user summary. Handle database uniqueness races without leaking internals. Apply the agreed verification behavior.
- [ ] **T3 - Enforce guest access boundaries** (REQ-004): Audit authenticated API routes and their guards. Explicitly allow only the agreed guest actions and deny guest access to regular-user/admin-only actions; do not rely on routes being unannotated. Add role-policy tests covering guest denial and existing admin/general-user behavior.
- [ ] **T4 - Add client registration and login flows** (REQ-001, REQ-002, REQ-005, REQ-006): Add `/auth/register` and `/auth/login` pages using the existing Nuxt/Tailwind patterns. Link the unauthenticated entry points, submit to the API, validate fields before submission, show server and field errors, prevent duplicate submits, and show the success confirmation with a clear path to login. Use the existing API base URL configuration and auth store when establishing the post-login session.
- [ ] **T5 - Verify behavior and document the contract** (REQ-001-REQ-006): Add API unit/controller tests for validation, email normalization, duplicate accounts, password hashing, guest assignment, safe responses, verification policy, and login compatibility. Add client tests for navigation, field validation, API failure/success states, and login persistence. Update Swagger and the developer guide with routes, role policy, and any verification configuration. Run focused API/client tests, then the workspace build and lint.

## Requirement Mapping

| Requirement | Planned coverage |
| --- | --- |
| REQ-001 Navigation | T4 registration/login routes and links; client navigation tests in T5 |
| REQ-002 Details and validation | T2 validated API DTO; T4 form validation and error states; tests in T5 |
| REQ-003 Account creation | T1 guest role/schema; T2 normalization, uniqueness, password hash and assignment; tests in T5 |
| REQ-004 Guest permissions | T1 permission policy; T3 explicit route enforcement and role tests |
| REQ-005 Confirmation | T2 safe API response; T4 success state; tests in T5 |
| REQ-006 Login | Existing password login reused by T4; API and client compatibility tests in T5 |

## Verification Criteria

- Invalid registration requests fail validation and create no account.
- A successful registration creates exactly one account with normalized email, a non-plaintext password hash, and `GUEST` role; its response excludes the hash.
- Duplicate email attempts return a stable client-safe error, including concurrent uniqueness conflicts.
- Guest requests are denied from every action outside the approved guest permission set; existing administrator access remains unchanged.
- Registration success is visible and leads to login; valid registered credentials establish the expected client session, while invalid credentials remain rejected.
- Focused API/client tests pass, followed by `npm test`, `npm run build`, and `npm run lint` from the repository root.

## Dependencies and Risks

- The guest permission matrix and the account transition (if a guest can later become a `GENERAL_USER`) must be decided before implementing enforcement.
- Email verification requires a delivery provider, token storage/expiry, and recovery/error flows; it expands the initial scope and should be explicitly approved.
- Introducing a PostgreSQL enum value requires a safe schema rollout for existing deployments. Do not depend on development `synchronize` behavior for production.
- Public registration and login endpoints should be protected against abuse (rate limiting and generic account-enumeration behavior); select the project's rate-limit mechanism before deployment.