import { describe, expect, it } from "vitest";
import { seedClaims } from "./demo";
import { getUser } from "./reference";
import { requiresOps, triage } from "./rules";
import type { Claim, FlagCode, User } from "./types";
import { act, canAct, intake, queueFor, visibleClaims, WorkflowError } from "./workflow";

const T = "2026-10-26T12:00:00+03:00";
const u = (id: string) => getUser(id) as User;
const byId = (claims: Claim[], id: string) => claims.find((c) => c.id === id)!;
const codes = (c: Claim) => c.flags.map((f) => f.code).sort();

describe("ten sample requests", () => {
  const claims = seedClaims();

  it("loads all ten and nothing is approved or paid", () => {
    expect(claims.map((c) => c.id)).toEqual(["R01", "R02", "R03", "R04", "R05", "R06", "R07", "R08", "R09", "R10"]);
    for (const c of claims) {
      expect(["pm_review", "needs_clarification"]).toContain(c.status);
      expect(c.approvals).toEqual({});
    }
  });

  const expected: Record<string, { triage: string; status: string; flags: FlagCode[] }> = {
    R01: { triage: "forward", status: "pm_review", flags: ["CURRENCY_ASSUMED"] },
    R02: { triage: "forward", status: "pm_review", flags: [] },
    R03: { triage: "investigate", status: "needs_clarification", flags: ["CURRENCY_ASSUMED", "MISSING_DATE", "POSSIBLE_DUPLICATE"] },
    R04: { triage: "investigate", status: "pm_review", flags: ["ABOVE_THRESHOLD", "CURRENCY_ASSUMED", "RELATED_PURCHASES", "URGENT_NOTED"] },
    R05: { triage: "clarify", status: "needs_clarification", flags: ["CURRENCY_ASSUMED", "MISSING_PROJECT"] },
    R06: { triage: "investigate", status: "pm_review", flags: ["CURRENCY_ASSUMED", "POSSIBLE_SPLIT", "RELATED_PURCHASES"] },
    R07: { triage: "investigate", status: "pm_review", flags: ["CURRENCY_ASSUMED", "POSSIBLE_SPLIT", "RELATED_PURCHASES"] },
    R08: { triage: "clarify", status: "needs_clarification", flags: ["CURRENCY_ASSUMED", "MISSING_EVIDENCE"] },
    R09: { triage: "clarify", status: "needs_clarification", flags: ["CURRENCY_ASSUMED", "CURRENCY_MISMATCH"] },
    R10: { triage: "clarify", status: "needs_clarification", flags: ["ARITHMETIC_MISMATCH"] },
  };

  for (const [id, exp] of Object.entries(expected)) {
    it(`${id} → ${exp.triage}`, () => {
      const c = byId(claims, id);
      expect(triage(c)).toBe(exp.triage);
      expect(c.status).toBe(exp.status);
      expect(codes(c)).toEqual([...exp.flags].sort());
    });
  }

  it("R03 is a potential duplicate of R01, and R01 itself stays clean", () => {
    expect(byId(claims, "R03").flags.find((f) => f.code === "POSSIBLE_DUPLICATE")?.params.of).toBe("R01");
    expect(codes(byId(claims, "R01"))).not.toContain("POSSIBLE_DUPLICATE");
  });

  it("R02 and R10 share Shop B but are not duplicates (different receipts)", () => {
    expect(codes(byId(claims, "R10"))).not.toContain("POSSIBLE_DUPLICATE");
    expect(codes(byId(claims, "R02"))).not.toContain("POSSIBLE_DUPLICATE");
  });

  it("R04, R06, R07 are linked for joint review; R06 + R07 = 1,270 flagged as possible split", () => {
    const r06 = byId(claims, "R06");
    expect(r06.flags.find((f) => f.code === "RELATED_PURCHASES")?.related.sort()).toEqual(["R04", "R07"]);
    expect(r06.flags.find((f) => f.code === "POSSIBLE_SPLIT")?.params.total).toBe(1270);
    expect(byId(claims, "R04").flags.find((f) => f.code === "RELATED_PURCHASES")?.params.total).toBe(2520);
  });

  it("R04 (1,250) and the split pair all need operations authorization; R01 does not", () => {
    for (const id of ["R04", "R06", "R07"]) expect(requiresOps(byId(claims, id))).toBe(true);
    expect(requiresOps(byId(claims, "R01"))).toBe(false);
  });

  it("never changes the requester's numbers or currency", () => {
    expect(byId(claims, "R10").amount).toBe(460);
    expect(byId(claims, "R09").amount).toBe(200);
    expect(byId(claims, "R09").currency).toBeNull();
    expect(byId(claims, "R05").projectCode).toBeNull();
  });
});

describe("approval workflow", () => {
  it("normal request: PM → Finance → approved, then payment is a separate step", () => {
    let claims = intake(seedClaims(), {
      receivedAt: T, channel: "form", requesterId: "huda", message: "Gloves for site", projectCode: "P-102",
      amount: 120, currency: "SAR", expenseDate: "2026-10-25", purpose: "Gloves",
      evidence: { ref: "IMG-200", vendor: "Shop F", date: "2026-10-25", currency: "SAR", total: 120, receiptNo: "F001" },
    }, { by: "huda", at: T, via: "submit" });
    const id = "R11";
    expect(byId(claims, id).status).toBe("pm_review");
    claims = act(claims, id, u("omar"), "approve", T);
    expect(byId(claims, id).status).toBe("finance_review");
    claims = act(claims, id, u("fatima"), "approve", T);
    expect(byId(claims, id).status).toBe("approved");
    expect(byId(claims, id).approvals.payment).toBeUndefined();
    claims = act(claims, id, u("fatima"), "record_payment", T, { note: "SIM-PAY-1" });
    expect(byId(claims, id).status).toBe("paid");
  });

  it("above SAR 1,000 goes to the operations manager; 'urgent' skips nothing", () => {
    let claims = seedClaims();
    claims = act(claims, "R04", u("omar"), "approve", T);
    expect(byId(claims, "R04").status).toBe("ops_review");
    expect(canAct(u("yousef"), byId(claims, "R04"), "approve")).toMatchObject({ ok: false, reason: "resolve_flags_first" });
    const idx = byId(claims, "R04").flags.findIndex((f) => f.code === "RELATED_PURCHASES");
    claims = act(claims, "R04", u("yousef"), "resolve_flag", T, { flagIndex: idx, note: "Checked with garage: separate jobs" });
    claims = act(claims, "R04", u("yousef"), "approve", T);
    expect(byId(claims, "R04").status).toBe("finance_review");
  });

  it("nobody approves or pays their own request", () => {
    let claims = intake(seedClaims(), {
      receivedAt: T, channel: "form", requesterId: "omar", message: "Site printer paper", projectCode: "P-101",
      amount: 80, currency: "SAR", expenseDate: "2026-10-25", purpose: "Printer paper",
      evidence: { ref: "IMG-201", vendor: "Shop G", date: "2026-10-25", currency: "SAR", total: 80, receiptNo: "G1" },
    }, { by: "omar", at: T, via: "submit" });
    const own = byId(claims, "R11");
    expect(canAct(u("omar"), own, "approve")).toMatchObject({ ok: false, reason: "own_claim" });
    expect(() => act(claims, "R11", u("omar"), "approve", T)).toThrow(WorkflowError);
    // The PM's own request is taken by the operations manager at the PM step.
    claims = act(claims, "R11", u("yousef"), "approve", T);
    expect(byId(claims, "R11").status).toBe("finance_review");

    claims = intake(claims, {
      receivedAt: T, channel: "form", requesterId: "fatima", message: "Courier", projectCode: "P-101",
      amount: 50, currency: "SAR", expenseDate: "2026-10-25", purpose: "Courier",
      evidence: { ref: "IMG-202", vendor: "Courier H", date: "2026-10-25", currency: "SAR", total: 50, receiptNo: "H1" },
    }, { by: "fatima", at: T, via: "submit" });
    claims = act(claims, "R12", u("omar"), "approve", T);
    expect(canAct(u("fatima"), byId(claims, "R12"), "approve")).toMatchObject({ ok: false, reason: "own_claim" });
  });

  it("finance can't skip the project manager", () => {
    expect(canAct(u("fatima"), byId(seedClaims(), "R01"), "approve")).toMatchObject({ ok: false, reason: "not_your_step" });
  });

  it("sample requests can be approved but never marked paid", () => {
    let claims = seedClaims();
    claims = act(claims, "R02", u("omar"), "approve", T);
    claims = act(claims, "R02", u("fatima"), "approve", T);
    expect(byId(claims, "R02").status).toBe("approved");
    expect(canAct(u("fatima"), byId(claims, "R02"), "record_payment")).toMatchObject({ ok: false, reason: "sample_no_payment" });
  });

  it("potential duplicate must be resolved by finance before approval", () => {
    let claims = seedClaims();
    claims = act(claims, "R03", u("ali"), "resubmit", T, { edits: { expenseDate: "2026-10-19" } });
    claims = act(claims, "R03", u("omar"), "approve", T);
    expect(canAct(u("fatima"), byId(claims, "R03"), "approve")).toMatchObject({ ok: false, reason: "resolve_flags_first" });
    claims = act(claims, "R03", u("fatima"), "reject", T, { note: "Duplicate of R01" });
    expect(byId(claims, "R03").status).toBe("rejected");
  });

  it("clarification: missing values must be supplied; mismatches need a response and go to finance", () => {
    let claims = seedClaims();
    expect(() => act(claims, "R05", u("mona"), "resubmit", T)).toThrow("fill_required");
    claims = act(claims, "R05", u("mona"), "resubmit", T, { edits: { projectCode: "P-103" } });
    expect(byId(claims, "R05").status).toBe("pm_review");

    expect(() => act(claims, "R10", u("mona"), "resubmit", T)).toThrow("response_required");
    claims = act(claims, "R10", u("mona"), "resubmit", T, { note: "Third line item was cut off in the photo" });
    const r10 = byId(claims, "R10");
    expect(r10.amount).toBe(460);
    expect(r10.flags.find((f) => f.code === "ARITHMETIC_MISMATCH")?.state).toBe("responded");
    claims = act(claims, "R10", u("omar"), "approve", T);
    expect(canAct(u("fatima"), byId(claims, "R10"), "approve")).toMatchObject({ ok: false, reason: "resolve_flags_first" });
  });

  it("a received receipt can't be edited; a missing one can be added", () => {
    let claims = seedClaims();
    expect(() =>
      act(claims, "R10", u("mona"), "resubmit", T, {
        note: "x",
        edits: { evidence: { ref: "IMG-110", total: 360, currency: "SAR", lineItems: [210, 150] } },
      }),
    ).toThrow("evidence_locked");
    claims = act(claims, "R08", u("huda"), "resubmit", T, {
      edits: { evidence: { ref: "IMG-108", vendor: "Shop B", date: "2026-10-22", currency: "SAR", total: 95, receiptNo: "B099" } },
    });
    expect(byId(claims, "R08").status).toBe("pm_review");
  });

  it("only finance sees the payment action, and only once approved", () => {
    const claims = seedClaims();
    expect(canAct(u("omar"), byId(claims, "R02"), "record_payment")).toMatchObject({ ok: false, reason: "not_your_step" });
  });

  it("reviewer actions need a reason", () => {
    expect(() => act(seedClaims(), "R01", u("omar"), "reject", T)).toThrow("note_required");
  });
});

describe("privacy", () => {
  it("a requester sees only their own requests", () => {
    const claims = seedClaims();
    expect(visibleClaims(u("ali"), claims).map((c) => c.id)).toEqual(["R01", "R03"]);
    expect(visibleClaims(u("mona"), claims).map((c) => c.id)).toEqual(["R05", "R10"]);
    expect(canAct(u("ali"), byId(claims, "R05"), "resubmit")).toMatchObject({ ok: false, reason: "not_visible" });
  });

  it("queues never include the reviewer's own requests", () => {
    const claims = intake(seedClaims(), {
      receivedAt: T, channel: "form", requesterId: "omar", message: "x", projectCode: "P-101", amount: 10,
      currency: "SAR", expenseDate: "2026-10-25", purpose: "x",
      evidence: { ref: "IMG-9", vendor: "V", date: "2026-10-25", currency: "SAR", total: 10, receiptNo: "1" },
    }, { by: "omar", at: T, via: "submit" });
    expect(queueFor(u("omar"), claims).map((c) => c.id)).not.toContain("R11");
    expect(queueFor(u("yousef"), claims).map((c) => c.id)).toContain("R11");
  });
});
