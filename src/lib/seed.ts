import type { Channel, Evidence } from "./types";

/** Shape accepted by "Import" — also how the ten samples are loaded. */
export interface IntakeRecord {
  id?: string;
  receivedAt: string;
  channel: Channel;
  requesterId: string;
  message: string;
  projectCode: string | null;
  amount: number | null;
  currency: string | null;
  expenseDate: string | null;
  purpose: string | null;
  urgent?: boolean;
  evidence: Evidence | null;
  evidenceNote?: string;
}

/**
 * The ten fictional sample requests from the brief. Fields are only filled where
 * the message itself states them — nothing is inferred from the receipt.
 */
export const SAMPLE_INTAKE: IntakeRecord[] = [
  {
    id: "R01",
    receivedAt: "2026-10-20T09:10:00+03:00",
    channel: "whatsapp",
    requesterId: "ali",
    message: "P-101, pump hose replacement, 380, bought Oct 19",
    projectCode: "P-101",
    amount: 380,
    currency: null,
    expenseDate: "2026-10-19",
    purpose: "Pump hose replacement",
    evidence: { ref: "IMG-101", vendor: "Shop A", date: "2026-10-19", currency: "SAR", total: 380, receiptNo: "A771" },
  },
  {
    id: "R02",
    receivedAt: "2026-10-20T10:05:00+03:00",
    channel: "email",
    requesterId: "huda",
    message: "P-102, safety tape, SAR 145, Oct 20",
    projectCode: "P-102",
    amount: 145,
    currency: "SAR",
    expenseDate: "2026-10-20",
    purpose: "Safety tape",
    evidence: { ref: "IMG-102", vendor: "Shop B", date: "2026-10-20", currency: "SAR", total: 145, receiptNo: "B091" },
  },
  {
    id: "R03",
    receivedAt: "2026-10-20T11:35:00+03:00",
    channel: "whatsapp",
    requesterId: "ali",
    message: "Please reimburse hose, 380, P-101",
    projectCode: "P-101",
    amount: 380,
    currency: null,
    expenseDate: null,
    purpose: "Hose",
    evidence: {
      ref: "IMG-101",
      vendor: "Shop A",
      date: "2026-10-19",
      currency: "SAR",
      total: 380,
      receiptNo: "A771",
      note: "Same image and receipt A771 as R01",
    },
  },
  {
    id: "R04",
    receivedAt: "2026-10-21T08:20:00+03:00",
    channel: "whatsapp",
    requesterId: "saleh",
    message: "Generator service, 1,250, P-103, Oct 21. Urgent",
    projectCode: "P-103",
    amount: 1250,
    currency: null,
    expenseDate: "2026-10-21",
    purpose: "Generator service",
    urgent: true,
    evidence: { ref: "IMG-104", vendor: "Garage C", date: "2026-10-21", currency: "SAR", total: 1250, receiptNo: "C814" },
  },
  {
    id: "R05",
    receivedAt: "2026-10-21T09:15:00+03:00",
    channel: "email",
    requesterId: "mona",
    message: "Fuel for site vehicle, 230, Oct 20; project not written",
    projectCode: null,
    amount: 230,
    currency: null,
    expenseDate: "2026-10-20",
    purpose: "Fuel for site vehicle",
    evidence: { ref: "IMG-105", vendor: "Fuel Station D", date: "2026-10-20", currency: "SAR", total: 230, receiptNo: "D277" },
  },
  {
    id: "R06",
    receivedAt: "2026-10-21T13:00:00+03:00",
    channel: "whatsapp",
    requesterId: "saleh",
    message: "Parts for generator, 640, P-103, Oct 21",
    projectCode: "P-103",
    amount: 640,
    currency: null,
    expenseDate: "2026-10-21",
    purpose: "Parts for generator",
    evidence: {
      ref: "IMG-106",
      vendor: "Garage C",
      date: "2026-10-21",
      currency: "SAR",
      total: 640,
      receiptNo: "C815",
      note: "generator service materials",
    },
  },
  {
    id: "R07",
    receivedAt: "2026-10-21T13:10:00+03:00",
    channel: "whatsapp",
    requesterId: "saleh",
    message: "Labour for generator, 630, P-103, Oct 21",
    projectCode: "P-103",
    amount: 630,
    currency: null,
    expenseDate: "2026-10-21",
    purpose: "Labour for generator",
    evidence: {
      ref: "IMG-107",
      vendor: "Garage C",
      date: "2026-10-21",
      currency: "SAR",
      total: 630,
      receiptNo: "C816",
      note: "generator service labour",
    },
  },
  {
    id: "R08",
    receivedAt: "2026-10-22T10:00:00+03:00",
    channel: "email",
    requesterId: "huda",
    message: "Cleaning supplies for P-102, 95, Oct 22",
    projectCode: "P-102",
    amount: 95,
    currency: null,
    expenseDate: "2026-10-22",
    purpose: "Cleaning supplies",
    evidence: null,
    evidenceNote: "No receipt attached; message says photo to follow",
  },
  {
    id: "R09",
    receivedAt: "2026-10-22T12:40:00+03:00",
    channel: "whatsapp",
    requesterId: "nabil",
    message: "P-101, delivery charge, 200, Oct 22",
    projectCode: "P-101",
    amount: 200,
    currency: null,
    expenseDate: "2026-10-22",
    purpose: "Delivery charge",
    evidence: { ref: "IMG-109", vendor: "Courier E", date: "2026-10-22", currency: "USD", total: 200, receiptNo: "E210" },
  },
  {
    id: "R10",
    receivedAt: "2026-10-22T15:25:00+03:00",
    channel: "email",
    requesterId: "mona",
    message: "P-102, site supplies, SAR 460, Oct 22",
    projectCode: "P-102",
    amount: 460,
    currency: "SAR",
    expenseDate: "2026-10-22",
    purpose: "Site supplies",
    evidence: {
      ref: "IMG-110",
      vendor: "Shop B",
      date: "2026-10-22",
      currency: "SAR",
      total: 460,
      receiptNo: "B095",
      lineItems: [210, 150],
    },
  },
];
