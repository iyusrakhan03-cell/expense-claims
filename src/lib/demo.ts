import { SAMPLE_INTAKE } from "./seed";
import type { Claim } from "./types";
import { intake } from "./workflow";

/** The ten sample requests, run through the same intake path as any import. */
export function seedClaims(): Claim[] {
  return SAMPLE_INTAKE.reduce<Claim[]>(
    (claims, rec) => intake(claims, rec, { by: rec.requesterId, at: rec.receivedAt, sample: true, via: "import" }),
    [],
  );
}
