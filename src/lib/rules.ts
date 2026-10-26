import { BASE_CURRENCY, OPS_THRESHOLD, PROJECTS } from "./reference";
import type { Claim, Flag, FlagCode, FlagKind, Role, Triage } from "./types";

/**
 * The rule checker. It only raises flags for a person to look at — it never
 * approves, rejects, pays, converts currency or corrects numbers.
 */

const MISSING_CODES: FlagCode[] = [
  "MISSING_PROJECT",
  "INVALID_PROJECT",
  "MISSING_AMOUNT",
  "MISSING_DATE",
  "MISSING_PURPOSE",
  "MISSING_EVIDENCE",
];

/** Flags that can't be answered with a note — the missing value must be supplied. */
export function isMissingField(code: FlagCode): boolean {
  return MISSING_CODES.includes(code);
}

export function effectiveCurrency(c: Pick<Claim, "currency">): string {
  return (c.currency ?? BASE_CURRENCY).toUpperCase();
}

function flag(
  code: FlagCode,
  kind: FlagKind,
  params: Flag["params"] = {},
  related: string[] = [],
  owner?: Role,
): Flag {
  return { code, kind, owner, params, related, state: "open" };
}

function receiptKey(c: Claim): string | null {
  if (!c.evidence?.receiptNo) return null;
  return `${(c.evidence.vendor ?? "").trim().toLowerCase()}|${c.evidence.receiptNo.trim().toLowerCase()}`;
}

function receivedBefore(a: Claim, b: Claim): boolean {
  if (a.receivedAt !== b.receivedAt) return a.receivedAt < b.receivedAt;
  return a.id < b.id;
}

function sameEvidence(a: Claim, b: Claim): boolean {
  if (!a.evidence || !b.evidence) return false;
  if (a.evidence.ref.trim().toLowerCase() === b.evidence.ref.trim().toLowerCase()) return true;
  const ka = receiptKey(a);
  return ka !== null && ka === receiptKey(b);
}

function purchaseDate(c: Claim): string | null {
  return c.evidence?.date ?? c.expenseDate;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function runRules(claim: Claim, all: Claim[]): Flag[] {
  const flags: Flag[] = [];
  const cur = effectiveCurrency(claim);

  // Required fields. Missing values are asked for, never guessed.
  if (!claim.projectCode) flags.push(flag("MISSING_PROJECT", "clarify"));
  else if (!PROJECTS[claim.projectCode]) flags.push(flag("INVALID_PROJECT", "clarify", { code: claim.projectCode }));
  if (claim.amount === null || !(claim.amount > 0)) flags.push(flag("MISSING_AMOUNT", "clarify"));
  if (!claim.expenseDate) flags.push(flag("MISSING_DATE", "clarify"));
  if (!claim.purpose?.trim()) flags.push(flag("MISSING_PURPOSE", "clarify"));
  if (!claim.evidence?.ref?.trim())
    flags.push(flag("MISSING_EVIDENCE", "clarify", claim.evidenceNote ? { note: claim.evidenceNote } : {}));

  // "Amounts in SAR unless stated otherwise" — applied, but shown as an assumption.
  if (claim.currency === null) flags.push(flag("CURRENCY_ASSUMED", "info", { currency: BASE_CURRENCY }));
  if (cur !== BASE_CURRENCY)
    flags.push(flag("FOREIGN_CURRENCY", "investigate", { currency: cur }, [], "finance"));

  // Request vs. what the receipt shows. Mismatches are reported, never fixed.
  const ev = claim.evidence;
  if (ev) {
    const evCur = ev.currency?.toUpperCase();
    if (evCur && evCur !== cur)
      flags.push(flag("CURRENCY_MISMATCH", "clarify", { claimed: cur, receipt: evCur }, [], "finance"));
    else if (ev.total !== undefined && claim.amount !== null && round2(ev.total) !== round2(claim.amount))
      flags.push(flag("AMOUNT_MISMATCH", "clarify", { claimed: claim.amount, receipt: ev.total, currency: cur }, [], "finance"));
    if (ev.lineItems?.length && ev.total !== undefined) {
      const sum = round2(ev.lineItems.reduce((a, b) => a + b, 0));
      if (sum !== round2(ev.total))
        flags.push(
          flag(
            "ARITHMETIC_MISMATCH",
            "clarify",
            { lines: ev.lineItems.join(" + "), sum, total: ev.total, currency: evCur ?? cur },
            [],
            "finance",
          ),
        );
    }
    if (ev.date && claim.expenseDate && ev.date !== claim.expenseDate)
      flags.push(flag("DATE_MISMATCH", "clarify", { claimed: claim.expenseDate, receipt: ev.date }, [], "finance"));
  }

  // Potential duplicate: same image or same vendor + receipt number as an earlier request.
  // Only the later one is flagged, and it stays "potential" until a person decides.
  const earlier = all.filter((o) => o.id !== claim.id && receivedBefore(o, claim) && sameEvidence(o, claim));
  if (earlier.length) {
    const first = earlier[0];
    flags.push(
      flag(
        "POSSIBLE_DUPLICATE",
        "investigate",
        { of: first.id, ref: first.evidence?.ref ?? "", receipt: first.evidence?.receiptNo ?? "" },
        earlier.map((o) => o.id),
        "finance",
      ),
    );
  }

  // Related purchases: same requester, same vendor, same day. Duplicates and rejected
  // requests don't count, so one receipt is never added up twice.
  const vendor = ev?.vendor?.trim().toLowerCase();
  const day = purchaseDate(claim);
  if (vendor && day) {
    const group = all
      .filter(
        (o) =>
          o.status !== "rejected" &&
          o.requesterId === claim.requesterId &&
          o.evidence?.vendor?.trim().toLowerCase() === vendor &&
          purchaseDate(o) === day &&
          effectiveCurrency(o) === cur,
      )
      .filter((o, _, arr) => !arr.some((p) => p.id !== o.id && receivedBefore(p, o) && sameEvidence(p, o)))
      .sort((a, b) => (receivedBefore(a, b) ? -1 : 1));
    const inGroup = group.some((o) => o.id === claim.id);
    if (inGroup && group.length >= 2) {
      const total = round2(group.reduce((s, o) => s + (o.amount ?? 0), 0));
      const others = group.filter((o) => o.id !== claim.id).map((o) => o.id);
      const receipts = group.map((o) => o.evidence?.receiptNo).filter(Boolean).join(", ");
      if (total > OPS_THRESHOLD) {
        flags.push(
          flag(
            "RELATED_PURCHASES",
            "investigate",
            { count: group.length, total, currency: cur, vendor: ev!.vendor!, date: day, receipts },
            others,
            "ops",
          ),
        );
      }
      // Possible split: two or more requests that are each under the threshold
      // but together go over it.
      const under = group.filter((o) => (o.amount ?? 0) <= OPS_THRESHOLD);
      const underTotal = round2(under.reduce((s, o) => s + (o.amount ?? 0), 0));
      if (under.length >= 2 && underTotal > OPS_THRESHOLD && under.some((o) => o.id === claim.id)) {
        flags.push(
          flag(
            "POSSIBLE_SPLIT",
            "investigate",
            { total: underTotal, currency: cur, threshold: OPS_THRESHOLD, ids: under.map((o) => o.id).join(" + ") },
            under.filter((o) => o.id !== claim.id).map((o) => o.id),
            "ops",
          ),
        );
      }
    }
  }

  if (cur === BASE_CURRENCY && claim.amount !== null && claim.amount > OPS_THRESHOLD)
    flags.push(flag("ABOVE_THRESHOLD", "info", { amount: claim.amount, threshold: OPS_THRESHOLD }));
  if (claim.urgent) flags.push(flag("URGENT_NOTED", "info"));

  return flags;
}

/**
 * Re-running the rules must not lose what people already did: a flag that still
 * applies keeps its response/resolution. Reviewer questions are kept as they are.
 */
export function mergeFlags(previous: Flag[], fresh: Flag[]): Flag[] {
  const merged = fresh.map((f) => {
    const old = previous.find((p) => p.code === f.code);
    return old ? { ...f, state: old.state, response: old.response, resolution: old.resolution } : f;
  });
  return [...merged, ...previous.filter((p) => p.code === "REVIEWER_QUESTION")];
}

export function isUnresolved(f: Flag): boolean {
  return f.kind !== "info" && f.state !== "resolved";
}

/** Can move forward / needs clarification from the requester / needs a person to investigate. */
export function triage(claim: Claim): Triage {
  const live = claim.flags.filter(isUnresolved);
  if (live.some((f) => f.kind === "investigate")) return "investigate";
  if (live.some((f) => f.kind === "clarify" && f.state === "open")) return "clarify";
  if (live.some((f) => f.kind === "clarify")) return "investigate";
  return "forward";
}

/** Above SAR 1,000, or flagged as a possible split / related purchase: Ops must also authorize. */
export function requiresOps(claim: Claim): boolean {
  if (effectiveCurrency(claim) === BASE_CURRENCY && (claim.amount ?? 0) > OPS_THRESHOLD) return true;
  return claim.flags.some((f) => f.code === "POSSIBLE_SPLIT" || f.code === "RELATED_PURCHASES");
}

export function hasOpenClarification(claim: Claim): boolean {
  return claim.flags.some((f) => f.kind === "clarify" && f.state === "open");
}
