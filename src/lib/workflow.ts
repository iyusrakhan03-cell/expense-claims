import { getUser, SYSTEM, USERS } from "./reference";
import { hasOpenClarification, isMissingField, isUnresolved, mergeFlags, requiresOps, runRules } from "./rules";
import type { IntakeRecord } from "./seed";
import type { Action, Claim, Flag, HistoryEntry, Role, Status, User } from "./types";

export const REVIEW_STEPS: Status[] = ["pm_review", "ops_review", "finance_review"];
const TERMINAL: Status[] = ["paid", "rejected"];

export class WorkflowError extends Error {
  constructor(
    public reason: string,
    public params: Record<string, string | number> = {},
  ) {
    super(reason);
  }
}

/** The approval "seat" a review step belongs to (who normally signs it). */
export function stepSeat(status: Status): Role | null {
  if (status === "pm_review") return "pm";
  if (status === "ops_review") return "ops";
  if (status === "finance_review" || status === "approved") return "finance";
  return null;
}

/**
 * The role that must act now. A project manager's own request can't be approved by
 * themselves, so the PM step is taken by the operations manager instead.
 */
export function actingRole(claim: Claim): Role | null {
  if (claim.status === "needs_clarification") return "requester";
  if (claim.status === "on_hold") return claim.heldBy ?? null;
  if (claim.status === "pm_review" && getUser(claim.requesterId)?.role === "pm") return "ops";
  return stepSeat(claim.status);
}

/** Who holds the request right now (the "owner" shown on every record). */
export function currentOwner(claim: Claim): User | null {
  const role = actingRole(claim);
  if (!role) return null;
  if (role === "requester") return getUser(claim.requesterId) ?? null;
  return USERS.find((u) => u.role === role && u.id !== claim.requesterId) ?? null;
}

/**
 * Finance and Operations have one person each in this demo, so a request of theirs would reach
 * a step nobody else can take. They don't submit requests here (open question for the team).
 */
export function canSubmit(role: Role): boolean {
  return role === "requester" || role === "pm";
}

export function canSee(user: User, claim: Claim): boolean {
  return user.role !== "requester" || claim.requesterId === user.id;
}

export function visibleClaims(user: User, claims: Claim[]): Claim[] {
  return claims.filter((c) => canSee(user, c));
}

/** Flags that must be resolved by the person at this step before they can approve. */
export function blockingFlags(claim: Claim): Flag[] {
  const seat = stepSeat(claim.status);
  return claim.flags.filter((f) => isUnresolved(f) && f.owner && f.owner === seat);
}

export type Check = { ok: true } | { ok: false; reason: string; params?: Record<string, string | number> };

const deny = (reason: string, params?: Record<string, string | number>): Check => ({ ok: false, reason, params });

export function canAct(user: User, claim: Claim, action: Action, flagIndex?: number): Check {
  if (!canSee(user, claim)) return deny("not_visible");
  if (action === "resubmit") {
    if (user.id !== claim.requesterId) return deny("only_requester");
    if (claim.status !== "needs_clarification") return deny("not_in_clarification");
    return { ok: true };
  }
  if (action === "submit") return { ok: true };

  // Every reviewer action: nobody reviews, approves or pays their own request.
  if (user.id === claim.requesterId) return deny("own_claim");
  if (TERMINAL.includes(claim.status)) return deny("closed");
  if (user.role !== actingRole(claim)) return deny("not_your_step");

  switch (action) {
    case "approve": {
      if (!REVIEW_STEPS.includes(claim.status)) return deny("not_your_step");
      const blocking = blockingFlags(claim);
      if (blocking.length) return deny("resolve_flags_first", { n: blocking.length });
      if (claim.status === "finance_review" && requiresOps(claim) && !claim.approvals.ops) return deny("needs_ops");
      if (claim.status === "finance_review" && !claim.evidence) return deny("no_evidence");
      return { ok: true };
    }
    case "reject":
    case "hold":
    case "send_back":
      if (![...REVIEW_STEPS, ...(action === "reject" ? (["on_hold"] as Status[]) : [])].includes(claim.status))
        return deny("not_your_step");
      return { ok: true };
    case "release":
      return claim.status === "on_hold" ? { ok: true } : deny("not_your_step");
    case "resolve_flag": {
      const f = flagIndex === undefined ? undefined : claim.flags[flagIndex];
      if (!f || !isUnresolved(f)) return deny("flag_not_open");
      if (!f.owner || f.owner !== stepSeat(claim.status)) return deny("flag_other_owner");
      if (f.kind === "clarify" && f.state === "open") return deny("flag_waiting_requester");
      return { ok: true };
    }
    case "record_payment":
      if (claim.status !== "approved") return deny("not_your_step");
      if (claim.isSample) return deny("sample_no_payment");
      if (claim.flags.some(isUnresolved)) return deny("open_flags_payment");
      return { ok: true };
  }
  return deny("not_your_step");
}

function entry(by: string, action: HistoryEntry["action"], at: string, extra: Partial<HistoryEntry> = {}): HistoryEntry {
  return { at, by, action, ...extra };
}

function rulesEntry(claim: Claim, at: string): HistoryEntry {
  return entry(SYSTEM, "rules", at, {
    codes: claim.flags.filter((f) => f.code !== "REVIEWER_QUESTION").map((f) => f.code),
  });
}

export function nextId(claims: Claim[]): string {
  const max = claims.reduce((m, c) => Math.max(m, Number(c.id.replace(/\D/g, "")) || 0), 0);
  return `R${String(max + 1).padStart(2, "0")}`;
}

/**
 * Past the PM step, a request that now needs Operations — e.g. a related purchase arrived after it
 * was approved — must go back to Operations instead of slipping through to payment.
 */
function needsOpsNow(c: Claim): boolean {
  if (c.status !== "finance_review" && c.status !== "approved") return false;
  if (requiresOps(c) && !c.approvals.ops) return true;
  return c.flags.some((f) => f.owner === "ops" && isUnresolved(f));
}

/**
 * Re-run the rules on every open request, e.g. so earlier requests learn about a new related one.
 * Newly raised flags are written to that request's history so the audit trail explains them.
 */
export function recomputeAll(claims: Claim[], at: string): Claim[] {
  return claims.map((c) => {
    if (TERMINAL.includes(c.status)) return c;
    const flags = mergeFlags(c.flags, runRules(c, claims));
    const added = flags.filter((f) => !c.flags.some((o) => o.code === f.code)).map((f) => f.code);
    const history = added.length ? [...c.history, entry(SYSTEM, "rules", at, { codes: added })] : c.history;
    const next: Claim = { ...c, flags, history };
    if (!needsOpsNow(next)) return next;
    return {
      ...next,
      status: "ops_review",
      approvals: { pm: next.approvals.pm },
      history: [...history, entry(SYSTEM, "reroute", at, { from: c.status, to: "ops_review" })],
    };
  });
}

/** New request (form or import). The rules decide only where it waits — never approval. */
export function intake(
  claims: Claim[],
  rec: IntakeRecord,
  opts: { by: string; at: string; sample?: boolean; via: "submit" | "import" },
): Claim[] {
  const requester = getUser(rec.requesterId);
  if (!requester || !canSubmit(requester.role)) throw new WorkflowError("cannot_submit");
  const id = rec.id && !claims.some((c) => c.id === rec.id) ? rec.id : nextId(claims);
  const draft: Claim = {
    id,
    isSample: !!opts.sample,
    receivedAt: rec.receivedAt,
    channel: rec.channel,
    requesterId: rec.requesterId,
    message: rec.message,
    projectCode: rec.projectCode?.trim() || null,
    amount: rec.amount,
    currency: rec.currency?.trim().toUpperCase() || null,
    expenseDate: rec.expenseDate || null,
    purpose: rec.purpose?.trim() || null,
    urgent: !!rec.urgent,
    evidence: rec.evidence?.ref?.trim() ? rec.evidence : null,
    evidenceNote: rec.evidenceNote,
    status: "pm_review",
    approvals: {},
    flags: [],
    history: [],
  };
  const all = [...claims, draft];
  draft.flags = runRules(draft, all);
  draft.status = hasOpenClarification(draft) ? "needs_clarification" : "pm_review";
  draft.history = [
    entry(opts.by, opts.via, opts.at, { to: draft.status }),
    rulesEntry(draft, opts.at),
  ];
  return recomputeAll(all, opts.at);
}

export interface Edits {
  projectCode?: string | null;
  amount?: number | null;
  currency?: string | null;
  expenseDate?: string | null;
  purpose?: string | null;
  evidence?: Claim["evidence"];
}

export interface ActOptions {
  note?: string;
  flagIndex?: number;
  edits?: Edits;
}

const NOTE_REQUIRED: Action[] = ["reject", "hold", "send_back", "resolve_flag", "record_payment"];

/** Apply one human action. Throws WorkflowError if the action isn't allowed. */
export function act(claims: Claim[], claimId: string, user: User, action: Action, at: string, opts: ActOptions = {}): Claim[] {
  const claim = claims.find((c) => c.id === claimId);
  if (!claim) throw new WorkflowError("not_found");
  const check = canAct(user, claim, action, opts.flagIndex);
  if (!check.ok) throw new WorkflowError(check.reason, check.params);
  const note = opts.note?.trim();
  if (NOTE_REQUIRED.includes(action) && !note) throw new WorkflowError("note_required");

  const c: Claim = structuredClone(claim);
  const from = c.status;
  const log = (extra: Partial<HistoryEntry> = {}) =>
    c.history.push(entry(user.id, action, at, { from, to: c.status, note, ...extra }));

  switch (action) {
    case "approve": {
      const seat = stepSeat(from)!;
      c.approvals[seat as "pm" | "ops" | "finance"] = { by: user.id, at, note };
      if (from === "pm_review") c.status = requiresOps(c) ? "ops_review" : "finance_review";
      else if (from === "ops_review") c.status = "finance_review";
      else c.status = "approved";
      log();
      break;
    }
    case "reject":
      c.status = "rejected";
      c.heldFrom = undefined;
      log();
      break;
    case "hold":
      c.heldFrom = from;
      c.heldBy = user.role;
      c.status = "on_hold";
      log();
      break;
    case "release":
      c.status = c.heldFrom ?? "pm_review";
      c.heldFrom = undefined;
      c.heldBy = undefined;
      log();
      break;
    case "send_back":
      c.flags.push({ code: "REVIEWER_QUESTION", kind: "clarify", params: { by: user.id, question: note! }, related: [], state: "open" });
      c.status = "needs_clarification";
      log();
      break;
    case "resolve_flag": {
      const f = c.flags[opts.flagIndex!];
      f.state = "resolved";
      f.resolution = { by: user.id, at, note: note! };
      log({ codes: [f.code] });
      break;
    }
    case "record_payment":
      c.approvals.payment = { by: user.id, at, note };
      c.status = "paid";
      log();
      break;
    case "resubmit": {
      const e = opts.edits ?? {};
      if ("projectCode" in e) c.projectCode = e.projectCode?.trim() || null;
      if ("amount" in e) c.amount = e.amount ?? null;
      if ("currency" in e) c.currency = e.currency?.trim().toUpperCase() || null;
      if ("expenseDate" in e) c.expenseDate = e.expenseDate || null;
      if ("purpose" in e) c.purpose = e.purpose?.trim() || null;
      // Evidence can be added when missing, but what a received receipt shows is never edited.
      if ("evidence" in e) {
        if (c.evidence) throw new WorkflowError("evidence_locked");
        c.evidence = e.evidence?.ref?.trim() ? e.evidence : null;
      }
      const others = claims.filter((o) => o.id !== c.id);
      c.flags = mergeFlags(c.flags, runRules(c, [...others, c]));
      const open = c.flags.filter((f) => f.kind === "clarify" && f.state === "open");
      const missing = open.filter((f) => isMissingField(f.code));
      if (missing.length) throw new WorkflowError("fill_required", { n: missing.length });
      if (open.length && !note) throw new WorkflowError("response_required");
      for (const f of open) {
        f.state = f.code === "REVIEWER_QUESTION" ? "resolved" : "responded";
        f.response = { by: user.id, at, note: note! };
      }
      // Changed data goes through review again from the start.
      c.approvals = {};
      c.status = "pm_review";
      log();
      c.history.push(rulesEntry(c, at));
      break;
    }
  }
  return recomputeAll(
    claims.map((o) => (o.id === c.id ? c : o)),
    at,
  );
}

/** Requests waiting for this user to act on. Own requests never appear here. */
export function queueFor(user: User, claims: Claim[]): Claim[] {
  if (user.role === "requester") return claims.filter((c) => c.requesterId === user.id && c.status === "needs_clarification");
  return claims.filter((c) => c.requesterId !== user.id && actingRole(c) === user.role && !TERMINAL.includes(c.status));
}

export type StatusGroup = "pending" | "approved" | "paid" | "rejected";

export function statusGroup(s: Status): StatusGroup {
  if (s === "approved") return "approved";
  if (s === "paid") return "paid";
  if (s === "rejected") return "rejected";
  return "pending";
}
