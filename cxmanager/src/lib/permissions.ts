import type { Role } from "@prisma/client";

export type Action =
  | "checklist.edit"
  | "checklist.validate"
  | "punch.create"
  | "punch.close_a"
  | "punch.close_bc"
  | "gate.approve_transition"
  | "rfo.sign"
  | "assets.edit_base"
  | "certificates.manage"
  | "users.manage";

const MATRIX: Record<Role, Action[]> = {
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

export function can(role: Role, action: Action): boolean {
  return MATRIX[role].includes(action);
}
