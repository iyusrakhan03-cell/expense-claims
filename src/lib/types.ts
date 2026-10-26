export type Role = "requester" | "pm" | "finance" | "ops";

export interface User {
  id: string;
  name: string;
  nameAr: string;
  role: Role;
}

export type Status =
  | "needs_clarification"
  | "pm_review"
  | "ops_review"
  | "finance_review"
  | "approved"
  | "paid"
  | "on_hold"
  | "rejected";

export type Channel = "whatsapp" | "email" | "form" | "import";

/** What the receipt image / attachment appears to show (transcribed, never verified). */
export interface Evidence {
  ref: string;
  vendor?: string;
  date?: string;
  currency?: string;
  total?: number;
  receiptNo?: string;
  lineItems?: number[];
  note?: string;
}

export type FlagKind = "clarify" | "investigate" | "info";

export type FlagCode =
  | "MISSING_PROJECT"
  | "INVALID_PROJECT"
  | "MISSING_AMOUNT"
  | "MISSING_DATE"
  | "MISSING_PURPOSE"
  | "MISSING_EVIDENCE"
  | "CURRENCY_ASSUMED"
  | "CURRENCY_MISMATCH"
  | "FOREIGN_CURRENCY"
  | "AMOUNT_MISMATCH"
  | "ARITHMETIC_MISMATCH"
  | "DATE_MISMATCH"
  | "POSSIBLE_DUPLICATE"
  | "RELATED_PURCHASES"
  | "POSSIBLE_SPLIT"
  | "ABOVE_THRESHOLD"
  | "URGENT_NOTED"
  | "REVIEWER_QUESTION";

export type FlagState = "open" | "responded" | "resolved";

export interface FlagNote {
  by: string;
  at: string;
  note: string;
}

export interface Flag {
  code: FlagCode;
  kind: FlagKind;
  /** Which role must clear an investigate flag before approving at its step. */
  owner?: Role;
  params: Record<string, string | number>;
  related: string[];
  state: FlagState;
  response?: FlagNote;
  resolution?: FlagNote;
}

export type Action =
  | "submit"
  | "resubmit"
  | "approve"
  | "reject"
  | "hold"
  | "release"
  | "send_back"
  | "resolve_flag"
  | "record_payment";

export interface HistoryEntry {
  at: string;
  by: string;
  action: Action | "import" | "rules";
  from?: Status;
  to?: Status;
  note?: string;
  /** For rule-checker entries: the flag codes it raised. */
  codes?: FlagCode[];
}

export interface Approval {
  by: string;
  at: string;
  note?: string;
}

export interface Claim {
  id: string;
  isSample: boolean;
  receivedAt: string;
  channel: Channel;
  requesterId: string;
  /** Original message or form text, kept exactly as supplied. */
  message: string;
  projectCode: string | null;
  amount: number | null;
  /** As stated by the requester; null means "not stated" (SAR is then assumed). */
  currency: string | null;
  expenseDate: string | null;
  purpose: string | null;
  urgent: boolean;
  evidence: Evidence | null;
  /** Free text about evidence that has not arrived yet, e.g. "photo to follow". */
  evidenceNote?: string;
  status: Status;
  heldFrom?: Status;
  heldBy?: Role;
  approvals: {
    pm?: Approval;
    ops?: Approval;
    finance?: Approval;
    payment?: Approval;
  };
  flags: Flag[];
  history: HistoryEntry[];
}

export type Triage = "forward" | "clarify" | "investigate";
