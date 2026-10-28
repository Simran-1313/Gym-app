# Diet plan generation — backend hand-off

The backend isn't in this repository, so these changes couldn't be made or
verified here. The mobile app has been made resilient to the current
behaviour. Each item below explains what the app now assumes and what the
backend should change.

## Contract the app relies on (unchanged endpoints)

| Endpoint | Used for |
| --- | --- |
| `POST /api/member/profile` | Save the profile. May return `{ profile, aiPlan }` (plan generated inline) or `{ profile, aiPlan: null }` (generated later). |
| `GET /api/member/profile` | Read-back to confirm a save. **Must return 404 (not 200 / 500) when no profile exists.** |
| `GET /api/member/ai-plans?page=1&limit=10` | Newest plan first. The app looks for a plan **id that differs** from the one it had, so ids must be unique (UUIDs). |
| `GET /api/member/ai-plans/:id` | Full plan. |
| `POST /api/member/ai-plans/diet` | Generate a new plan. |

Error bodies should keep the `{ success: false, message }` shape. The app shows
`message` to members for 4xx responses (so keep those human-readable) and
**never** for 5xx responses.

## Required / strongly recommended changes

1. **Persist the profile before calling the LLM, and commit it independently.**
   The app confirms a save by reading the profile back while the POST is still
   running, which lets the member into the app in about 2–3 s instead of
   waiting for the LLM. If the profile write and the plan generation share one
   transaction, the read-back can't see the profile until generation finishes.
   That brings the old wait back, and a failed generation rolls back the
   profile.

2. **Make generation asynchronous.** The best fix is for `POST /member/profile`
   to return immediately with `aiPlan: null` and generate in a job/queue. The
   app already handles this: it polls `GET /ai-plans` every 6 s for up to 4 min,
   even across app restarts. Optionally add `GET /member/ai-plans/status`
   returning `{ status: 'PENDING'|'READY'|'FAILED', error? }` so the app can
   show a real failure instead of waiting out the window.

3. **Idempotency and concurrency.** While a DIET generation is running for a
   member, a second `POST /ai-plans/diet` (or profile save) should return the
   in-flight job, or a `409`, instead of starting another LLM call. Use a
   per-member lock (e.g. a unique partial index on `ai_plan_jobs(member_id)
   WHERE status = 'PENDING'`). Optionally accept an `Idempotency-Key` header.

4. **Keep generating after the client disconnects.** Mobile requests are
   dropped by network changes and app restarts. Generation must not be tied to
   the HTTP request lifecycle; the app looks for the result afterwards.

5. **Provider timeouts and retries server-side.** Bound each LLM call (for
   example 45 s), retry transient provider errors (429/5xx) with backoff, and
   fall back across models. Then return a definite `502/503` with a readable
   `message`, instead of hanging until the client's 120 s timeout.

6. **Validate the LLM output before saving.** Only persist a plan whose content
   has `days[].meals[]` with numeric calories and macros. The app already
   refuses to present a malformed plan as valid ("This plan couldn't be
   displayed"), but a bad row should never be saved as a successful plan.

7. **Never return `success: true` without a saved plan** on
   `POST /ai-plans/diet`.

8. **401 only for auth failures.** The app treats any 401 (other than on login)
   as an expired session and signs the member out. Don't use 401 for
   permission or plan-tier checks; use 403.

9. **Logging.** Don't log request bodies for `/member/auth/login` or
   `/member/profile` (passwords, health data), or the `member_token` cookie.

## Validation ranges used by the app

The app now enforces age 13–100, height 100–250 cm and weight 30–300 kg
(previously 10–120 / 0–300 / 0–500). The server should enforce the same or
wider ranges and return `400` with a readable `message` otherwise.

## Environment

`EXPO_PUBLIC_API_URL` (native) and `EXPO_PUBLIC_API_URL_WEB` (web) must be set
per environment. Both fall back to `http://localhost:4000`, which only works
on a simulator or web. A physical device or a production build needs the real
URL set at build time (EAS environment variables).
