// Basic test skeleton for ModalManager
// Run with your preferred test runner; this file is a minimal smoke test.

import { Modal } from '../views/modals/Modal.mjs';

async function smoke() {
  // When running in browser, Modal will create DOM elements.
  const res = await Modal.open({ type: 'intro_find_rome', once: true });
  console.assert(res && (res.skipped || res.acknowledged), 'Modal did not resolve as expected');
  console.log('Modal smoke test finished');
}

// Export for test runner
export { smoke };
