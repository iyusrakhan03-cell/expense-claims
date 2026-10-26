# Project Expense Requests — prototype

A small working app for requesting, checking, approving and tracking project expenses, with English/Arabic (RTL) and four role views. All data is fictional; login, payment and receipt images are simulated.

**Live demo:** _link added on deployment_

## Try it (no setup)

1. Open the link. Ten sample requests (R01–R10) are already loaded, and a **"Choose who you are"** picker opens showing what each person can and cannot do.
2. Use **View the app as…** (top bar, or the person card in the sidebar) to switch person at any time. Each person gets their own home screen:
   - Requesters (Ali, Huda, Saleh, Mona, Nabil) — **My expenses**: what reviewers need from them, and a progress tracker per request
   - Omar, Project Manager — **Approvals** inbox (waiting / on hold / decided)
   - Yousef, Operations Manager — **Second authorizations**, plus a "review together" panel for related purchases (R04, R06, R07)
   - Fatima, Finance Reviewer — **Finance desk** (to review / ready to pay / paid)
   - Reviewers also get **All requests** (search + filters by status, project, assessment, requester, flag) and an **Overview** dashboard
3. Follow **How to test** in the app's menu for a 5-minute walkthrough.
4. **Reset demo** puts the ten samples back. Data lives in your browser only, so every reviewer gets their own copy.

## Run locally

Requires Node.js 18.17+.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 28 rule/workflow tests (sample outcomes, separation of duties, privacy)
npm run build && npm start
```

## How it is built

| Part | Where |
|---|---|
| Rule checker — only raises flags, never decides | `src/lib/rules.ts` |
| Workflow + permission guard (who may do what, at which step) | `src/lib/workflow.ts` |
| The ten sample requests, exactly as in the brief | `src/lib/seed.ts` |
| English / Arabic text | `src/lib/i18n.ts` |
| Role home screens · person picker · filters · approval stepper | `src/components/` |
| Pages (home, requests, request detail, overview, new, import, guide) | `src/app/` |
| Tests | `src/lib/engine.test.ts` |

Every action goes through `canAct()` in the workflow engine, so the rules hold even if the UI is bypassed. Next.js 14.2.35, React 18, Tailwind CSS 3, Lucide icons, Plus Jakarta Sans + IBM Plex Sans Arabic. No backend and no external services.

## Sample outcome

| Assessment | Requests | Why |
|---|---|---|
| Can move forward | R01, R02 | Complete; R01's currency is assumed SAR (shown as an assumption) |
| Needs clarification | R05, R08, R09, R10 | Project missing · no receipt yet · USD receipt vs SAR request · receipt lines 360 ≠ stated total 460 |
| Needs investigation | R03, R04, R06, R07 | Potential duplicate of R01 (and no date) · same garage, same day, consecutive receipts, 2,520 SAR together; R06 + R07 = 1,270 possible split |

Nothing is approved, rejected, converted or paid automatically. Sample requests can never be marked paid.
