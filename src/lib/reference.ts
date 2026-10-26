import type { User } from "./types";

export const BASE_CURRENCY = "SAR";
/** Claims strictly above this amount need a second authorization. */
export const OPS_THRESHOLD = 1000;

export const PROJECTS: Record<string, { en: string; ar: string }> = {
  "P-101": { en: "North Site", ar: "الموقع الشمالي" },
  "P-102": { en: "Warehouse Fit-out", ar: "تجهيز المستودع" },
  "P-103": { en: "Road Works", ar: "أعمال الطرق" },
};

/** Fictional demo users. One person per reviewer role. */
export const USERS: User[] = [
  { id: "ali", name: "Ali", nameAr: "علي", role: "requester" },
  { id: "huda", name: "Huda", nameAr: "هدى", role: "requester" },
  { id: "saleh", name: "Saleh", nameAr: "صالح", role: "requester" },
  { id: "mona", name: "Mona", nameAr: "منى", role: "requester" },
  { id: "nabil", name: "Nabil", nameAr: "نبيل", role: "requester" },
  { id: "omar", name: "Omar", nameAr: "عمر", role: "pm" },
  { id: "fatima", name: "Fatima", nameAr: "فاطمة", role: "finance" },
  { id: "yousef", name: "Yousef", nameAr: "يوسف", role: "ops" },
];

export const SYSTEM = "system";

export function getUser(id: string): User | undefined {
  return USERS.find((u) => u.id === id);
}
