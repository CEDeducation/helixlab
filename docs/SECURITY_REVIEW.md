# Security review — read before launch

## Implemented design controls

- Supabase Auth and per-workspace Postgres RLS. Never use student profile selection as an authorization decision.
- One email supports up to five personas, while real group collaborators have separate authenticated accounts and roles.
- Invitation acceptance checks the invitation email and its expiry; SQL update also requires confirmed email.
- Private storage only; limits and extension allowlist for scientific uploads. Sensitive objects cannot be made public by this UI.
- API proxy verifies Supabase user before allowing backend RDKit computations; secret stays server-side.
- No application service-role key in browser. `X-Content-Type-Options`, clickjacking and referrer headers configured.
- Strict scientific text decoding and IUPAC rejection, no `eval`, no dynamic execution of uploaded documents.
- GitHub CI: module tests, architectural audit, dependency installation and build.

## Must be completed before accepting unpublished/patent-sensitive data

1. Execute SQL migrations in a fresh Supabase project and test RLS using **two different real accounts** (read, write, invite, viewer, denied operations, record restore).
2. Run automated dependency scanning, secret scanning, security headers review, and an independent penetration test.
3. Add server-verified original-file checksums and transactional/compensating upload cleanup; support backups, retention and restoration.
4. Add rate limiting, abuse monitoring and per-user quotas to Next API and Python compute endpoints.
5. Configure email delivery/invitation lifecycle, verified redirects, MFA policy, revoke/reset access, and session handling.
6. Confirm proper cookie refresh handling for server-authenticated endpoints under the deployed Next.js version.
7. Run browser/accessibility tests and a production build on Vercel; review code with an experienced software/security engineer.

**No developer can certify “world-class security” from static source review and a small unit test suite.**

## October 2026 framework patch

The project pins **Next.js 15.5.28** and **React 19.1.10** to avoid disclosed October 14, 2026 React/Next.js vulnerabilities in earlier versions. `@supabase/ssr` uses the 0.12.x series. Track new advisories and verify all package compatibility with `npm install` and `next build` before deployment. `npm audit` and GitHub Dependabot are recommended, and dependency lockfile creation remains outstanding because npm registry download was unavailable during packaging.

## v0.7 computational endpoints

- Four new Next.js scientific routes proxy to a fixed endpoint allowlist after Supabase identity checks; no dynamic user-supplied destination URLs.
- Science service enforces a constant-time secret comparison and input length caps. Model inputs never use `eval`, shell execution or user-controlled local filenames.
- Vina operates on ephemeral fixed names in a temporary directory with capped CPU, exhaustiveness, poses and docking-box size; **a separate job queue, compute timeout, per-account quota and OS-level resource isolation remain necessary before public use**.
- Uploads to Mol*/Ketcher are local browser files; raw strings are not executed as code. Scientific parsers can still have vulnerabilities; keep dependencies patched.
- Researcher inputs sent to the private compute service must use TLS, restricted ingress, server secrets, logging protections and data retention controls.
