-- Asset.punchACount was a stub field left on purpose by asset-commissioning
-- for punch-list to take over (see SPEC-asset-commissioning.md and
-- SPEC-punch-list.md). Open punch A counts are now computed live from the
-- Punch table (lib/assets.ts, ativos/actions.ts) instead of stored here.
ALTER TABLE "Asset" DROP COLUMN "punchACount";
