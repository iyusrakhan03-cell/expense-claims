# Handoff — Project Expense Requests prototype

**Main workflow.** Request (form, or imported from WhatsApp/email) → rule check → **Project Manager** (is it needed for this project?) → **Operations Manager** second authorization if above SAR 1,000 or flagged as a possible split → **Finance** (evidence, duplicates, arithmetic, eligibility) → **Approved – awaiting payment** → **Paid** (separate, simulated step). Any reviewer can reject, hold or send a question back; missing or questionable information returns to the requester, who fixes it and resends. A received receipt can't be edited, only explained. Nobody can act on their own request; a PM's own request goes to the Operations Manager. If a new warning appears after approval (e.g. the second half of a split arrives), the request goes back to Operations, and nothing can be paid while a warning is open. Every action is logged with who, when and why.

**Where AI helps — and where it must not decide.** Useful: turning a WhatsApp/email message and receipt photo into a draft request (project, amount, currency, date, vendor, receipt no., line items) for the requester to confirm; spotting likely duplicates; summarising a request for the reviewer. It must not: approve, reject or pay; fill in a missing project, date or currency; convert currency or "fix" totals; or clear a duplicate/split flag. In this prototype the rule checker is deterministic and only raises flags. Real data should go only to an approved, tenant-bound AI service, not public tools.

**Validated vs. assumed.**
Validated (28 automated tests + a full click-through): all ten samples land in the right place with the right reason (2 forward, 4 clarification, 4 investigation); none can be paid; above-1,000 and split cases reach Operations; "urgent" skips nothing; self-approval is blocked; requesters see only their own records; switching language changes no data or status.
Assumed (to verify before go-live): SAR when no currency is stated; exactly 1,000 does not need Operations ("above"); a possible split = same requester + vendor + day, together above 1,000; non-SAR requests are never converted and always go to Operations; one PM covers all three projects; Finance and Operations don't submit requests here, because nobody else could review them. Verify each with Finance/Operations against the written policy and one month of past claims.

**Three questions for the team.**
1. What counts as splitting a purchase (same vendor/day? same job?), and should Operations always see grouped requests?
2. How are foreign-currency receipts and VAT handled — whose rate, and is a VAT invoice required to pay?
3. Who approves for a project when its PM is absent or is the requester, and who backs up Finance?

**Before real use (access control).** The "Acting as" selector is demo-only. Production needs Microsoft Entra ID sign-in, roles from Entra groups per project, and permission checks on the server/data layer (e.g. SharePoint item permissions or row-level security) so requesters truly can't read others' records — not just a hidden screen.

**First deployment step.** Pilot on one project (≈20 requests/month) inside Microsoft 365: Entra sign-in, requests stored in a SharePoint list or Dataverse, Teams notifications to approvers, Excel export for Finance. Run two weeks alongside the current WhatsApp process, then compare.

**Two measures of improvement.** (1) Median days from request to payment. (2) Share of requests sent back for missing or wrong information (and duplicates caught before payment).
