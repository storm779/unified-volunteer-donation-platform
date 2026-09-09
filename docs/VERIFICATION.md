# Verification record

Verified locally on 9 September 2026 with Node.js 24.19.0 on Windows.

| Check                                                            | Result                                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Install frontend, backend, and root dependencies                 | Passed; npm lockfiles included for all three packages                                             |
| Frontend production build (`npm run build` from repository root) | Passed                                                                                            |
| Backend startup on port 5000                                     | Passed; `/api/health` reports `firebase` and simulated payments                                   |
| Backend integration suite                                        | 15 tests passed                                                                                   |
| Browser suite in Chromium                                        | 7 tests passed                                                                                    |
| Responsive layout                                                | Checked desktop 1440 × 1000 and mobile 390 × 844; tested routes have no horizontal overflow       |
| Frontend runtime errors                                          | No page errors in the public navigation walkthrough                                               |
| Local campaign image loading                                     | All bundled photographs loaded successfully                                                       |
| Environment and local data exclusions                            | `.env`, `.env.*`, and `server/data/` ignored; both `.env.example` files retained                  |
| Frontend secret scan                                             | No Razorpay secret or Firebase Admin private-key references in client source or production bundle |

## Exercised workflows

Backend tests cover configuration failure, CORS and Host checks, validation, password hashing, concurrent registration, roles and organization ownership, private response scoping, duplicate applications, application review and withdrawal, payment-signature rejection, captured-payment validation, payment replay, concurrent donation idempotency, disabled users, Firebase token/profile behavior with an injected test verifier, local persistence, rollback, SSE invalidation, and personal dashboard scoping.

Browser tests cover search and category filters, empty and missing routes, donor sign-in, normal registration and password login, profile updates, logout and route protection, donation confirmation and live updates in a second browser page, application submission and organization review, withdrawal, organization creation/editing of both campaigns and opportunities, and admin role/access/campaign management.

The browser suite starts its own in-memory API on port 5100 and frontend on port 5174. It does not modify `server/data/demo.json`. It captures the committed screenshots before modifying test data.

## Connected Firebase verification

Using the supplied external service account, verified Email/Password registration and login, API ID-token verification and profile synchronization, a Firestore donation transaction, duplicate confirmation idempotency, personal donation history, and a browser SDK onSnapshot update. A direct browser write was rejected by the deployed Firestore rules. The temporary verification account and all its records were removed afterward.

Published the repository Firestore rules and seeded six fictional campaigns, five opportunities, and eighteen sample donation records. No authentication accounts or privileged roles were seeded. Private credentials remain outside the repository; local configuration is ignored by Git.

## External-service limitations

Razorpay was skipped at the user's request. Connected Firebase uses explicit simulated payments, with no charges. Razorpay signature and capture assertions are covered by an injected test gateway; an actual Razorpay Test Mode checkout remains untested. This verification does not claim live payments or production readiness.
