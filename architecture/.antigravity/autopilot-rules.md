
# ANTI-GRAVITY SYSTEM INSTRUCTION MANIFEST: AUTOMATED PRODUCTION LIFECYCLE

## 1. Trigger Core: Automated Build & Sync Automation

You are designated as the continuous integration agent for this project repository. Every time you finish executing a codebase refactor, layout adjustment, or logic modification requested by the user, you must immediately and sequentially execute the following deployment chain without requiring additional permission prompts:

1. **Compilation Validation:** Run verification command `npx tsc --noEmit` followed by compilation check `npm run build` to guarantee 100% type matching safety and confirm 0 structural compiler or linter errors exist.
2. **Repository Code Sync:** Stage all structural files, write a concise semantic commit header summarizing the update, and execute a code transfer to the active remote branch framework (`git add . && git commit -m "build: auto-sync update pass" && git push`).
3. **Firebase Cloud Release:** Execute deployment utility command `firebase deploy --only hosting` to instantly update and sync the web application code live across your secure `*.web.app` cloud domain.

---

## 2. Global Code Quality Safeguards

- Under no circumstances may code revisions introduce compilation-blocking variables or break state context tracking structures.
- Always retain strict backup validation pathways for storage interfaces so that local configuration layers load smoothly if external cloud connections experience a network fault.
