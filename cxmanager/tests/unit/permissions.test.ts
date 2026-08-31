import { describe, expect, it } from "vitest";
import { can, type Action } from "../../src/lib/permissions";
import type { Role } from "@prisma/client";

const ALL_ACTIONS: Action[] = [
  "checklist.edit",
  "checklist.validate",
  "punch.create",
  "punch.close_a",
  "punch.close_bc",
  "gate.approve_transition",
  "rfo.sign",
  "assets.edit_base",
  "certificates.manage",
  "users.manage",
];

const ALLOWED: Record<Role, Action[]> = {
  campo: ["checklist.edit", "punch.create", "punch.close_bc"],
  qualidade: [
    "checklist.validate",
    "punch.create",
    "punch.close_bc",
    "certificates.manage",
  ],
  aprovador: [
    "checklist.edit",
    "checklist.validate",
    "punch.create",
    "punch.close_a",
    "punch.close_bc",
    "gate.approve_transition",
    "rfo.sign",
    "assets.edit_base",
    "certificates.manage",
    "users.manage",
  ],
};

describe("can", () => {
  for (const role of Object.keys(ALLOWED) as Role[]) {
    for (const action of ALL_ACTIONS) {
      const expected = ALLOWED[role].includes(action);
      it(`${role} × ${action} → ${expected}`, () => {
        expect(can(role, action)).toBe(expected);
      });
    }
  }
});
