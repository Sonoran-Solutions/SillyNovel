# PR #29 migration-policy correction

Review starting head `0bcf9f8c7fd3edaa428412a7fe91e7570bc936d3`; original frozen code `80c03000b9f9b3a2a5c67e4daa6752d1964ee515`. Original tests, fingerprints, screenshots and 17 host checkpoints under `docs/evidence/project-library/` are preserved as historical evidence.

P2: fixed the policy issue by removing startup migration entirely. `openStore` refuses exact v1 with `MIGRATION_REQUIRED` without changing its bytes. The plugin reports that typed condition; the stage retains native reading/composer/session controls. Existing v2 behavior and the asset-library contract are unchanged.

The existing recovery publication path now supports explicit `migrate V1_BACKUP_DIR NEW_DATA_ROOT/.sillynovel-projects.sqlite`. Input must be a fully validated preserved v1 backup with verified destination account incarnations. Only its private staged copy changes, under a transaction; full schema/catalog/scene/reference/PNG validation follows before exclusive publication into an absent stopped-host slot. Both original v1 store and backup remain unchanged after success. No v2 downgrade, overwrite, inferred destination, automatic activation, HTTP migration, new database framework or dependency. [Operator workflow and rollback limits](M1_PNG_ASSET_LIBRARY.md#explicit-v1--v2-transition).

P3 browser coverage: a focused actual-entry regression edits an inert label, saves it, unregisters another alternative, saves, reloads and explicitly reopens, then selects/saves the surviving sprite. Checks catalog persistence, UUID references, compatibility, slot/locks and native draft. A separate actual-entry test verifies migration-required fallback.

DYL-22 factual handoff, including the original P2 REVISE finding, was published with the owner's explicit approval; the issue is In Review. Original description/unfinished acceptance and blocker relations remain unchanged. DYL-55 tracker reconciliation remains separate; DYL-23 stays gated, Decision F undecided and Gate A NOT_RUN. PR #29 remains draft/open/unmerged, auto-merge disabled.

Final frozen correction SHA, exact commands/results and new evidence are recorded after execution below.
