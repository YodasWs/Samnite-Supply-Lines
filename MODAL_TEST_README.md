Manual Modal Smoke Test

Purpose: quickly exercise the Modal manager in a real browser to verify presentation, queueing, and "don't show again" behavior.

Files:
- modal_test.html — small page that imports the in-repo Modal and provides buttons to trigger modals.

Run locally (recommended options):

1) Using Python 3 (simple, cross-platform):

```powershell
# from project root
python -m http.server 8000
# then open http://localhost:8000/modal_test.html
```

2) Using Node (if you have `http-server` or `serve`):

```powershell
npx http-server -c-1 . 8000
# or
npx serve . -l 8000
# then open http://localhost:8000/modal_test.html
```

What to check:
- Intro modal appears when clicking "Show Intro".
- Multiple clicks queue modals (no overlap) and resolve in order.
- "Don't show again" resolves with `{dontShowAgain:true}` and subsequent `once:true` opens are skipped (Modal resolves with `{skipped:true}`).
- Priority ordering: higher `priority` items should appear before lower priority ones in queue.

Notes:
- The test imports `src/pages/game/views/modals/Modal.mjs` directly. Serve via HTTP (not file://) to allow module imports.
- If other in-game globals are required in Modal, the test uses the component's DOM-only behavior; full integration tests should be run inside the game build.
