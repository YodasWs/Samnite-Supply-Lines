// Lightweight Modal manager for the game UI
// API: Modal.open({type, title, body, payload, once=true, priority=0}) => Promise(resolved on close)
//       Modal.close()

// Load English locale strings (packaged as JSON)
import en from '../../locales/en.json' with { type: 'json' };

export default class ModalManager {
  constructor() {
    this.queue = [];
    this.isShowing = false;
    this._seen = new Set();
    this._createRoot();
  }

  _createRoot() {
    if (typeof document === 'undefined') return;
    this.root = document.getElementById('game-modal-root') || document.createElement('div');
    this.root.id = 'game-modal-root';
    document.body.appendChild(this.root);
  }

  open({ type, title, body, payload = {}, once = true, priority = 0 } = {}) {
    return new Promise((resolve) => {
      if (once && type && this._seen.has(type)) {
        resolve({ skipped: true });
        return;
      }

      const item = { type, title, body, payload, once, priority, resolve };
      // insert by priority (higher first)
      const i = this.queue.findIndex(q => q.priority < priority);
      if (i === -1) this.queue.push(item); else this.queue.splice(i, 0, item);
      this._processQueue();
    });
  }

  close(result = {}) {
    if (!this.current) return;
    const cur = this.current;
    this._destroyCurrent();
    if (cur.once && cur.type) this._seen.add(cur.type);
    cur.resolve(result);
    this.current = null;
    this.isShowing = false;
    // small async gap to avoid immediate re-entry
    setTimeout(() => this._processQueue(), 50);
  }

  _processQueue() {
    if (this.isShowing) return;
    if (this.queue.length === 0) return;
    const next = this.queue.shift();
    this.current = next;
    this.isShowing = true;
    this._render(next);
  }

  _render(item) {
    if (typeof document === 'undefined') return;
    this._destroyCurrent();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const box = document.createElement('div');
    box.className = 'modal-box';

    const h = document.createElement('h2');
    h.className = 'modal-title';
    h.textContent = item.title || this._lookupTitle(item.type) || 'Notice';

    const p = document.createElement('div');
    p.className = 'modal-body';
    // Prefer explicit body, then formatted payload-aware body, then static lookup
    p.textContent = item.body || this._formatBody(item.type, item.payload) || this._lookupBody(item.type) || '';

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-btn modal-btn-primary';
    closeBtn.textContent = 'OK';
    closeBtn.addEventListener('click', () => this.close({ acknowledged: true }));

    const skipBtn = document.createElement('button');
    skipBtn.className = 'modal-btn modal-btn-secondary';
    skipBtn.textContent = "Don't show again";
    skipBtn.addEventListener('click', () => this.close({ acknowledged: true, dontShowAgain: true }));

    actions.appendChild(closeBtn);
    actions.appendChild(skipBtn);

    box.appendChild(h);
    box.appendChild(p);
    box.appendChild(actions);

    overlay.appendChild(box);
    this.root.appendChild(overlay);
    this._currentEl = overlay;

    // focus for a11y
    closeBtn.focus();
  }

  // Format modal body using payloads for richer messages
  _formatBody(type, payload = {}) {
    try {
      switch (type) {
        case 'food_spoiled': {
          const count = payload.count ?? (payload.goods ? 1 : 0);
          const totalRounds = payload.totalRounds ?? payload.rounds ?? 0;
          const start = payload.exampleStart ?? payload.farm ?? payload.goods?.start ?? null;
          if (count > 1) {
            return `Alert: ${count} food shipments spoiled in transit (total spoil rounds: ${totalRounds}). Consider building Farms closer to Rome or improving transport.`;
          }
          if (start && typeof start.row !== 'undefined' && typeof start.col !== 'undefined') {
            return `Alert: Food spoiled in transit from Farm at ${start.row}×${start.col}. Consider building Farms closer to Rome or improving transport routes.`;
          }
          return 'Alert: Some Food spoiled in transit. Consider building Farms closer to Rome or improving transport routes.';
        }
        case 'distance_spoil_warning': {
          const d = payload.distance ?? payload.example?.distance ?? payload.exampleStart?.distance ?? null;
          if (Number.isFinite(d)) {
            return `Warning: This Farm is ${d} tiles from Rome. Food from here will spoil after 5 rounds in transit. Place Farms closer to Rome to avoid spoilage.`;
          }
          if (payload.count) {
            return `Warning: ${payload.count} Farms are more than 5 tiles from Rome. Food from these Farms will spoil after 5 rounds in transit.`;
          }
          return null;
        }
        default:
          return null;
      }
    } catch (e) {
      console.warn('Error formatting modal body', e);
      return null;
    }
  }

  _destroyCurrent() {
    if (this._currentEl && this._currentEl.parentNode) this._currentEl.parentNode.removeChild(this._currentEl);
    this._currentEl = null;
  }

  // Basic localization lookup stub; integrators should replace with real i18n lookup
  _lookupTitle(type) {
    const titles = {
      intro_find_rome: 'Find Rome',
      farm_before_rome_warning: 'Farm built before Rome',
      post_rome_build_guidance: 'Now that Rome is found',
      distance_spoil_warning: 'Food Spoilage Warning',
      first_food_arrival: 'Supply Success',
      rome_demand_increase: 'Rome Demand Increased',
      food_spoiled: 'Food Spoiled',
      first_enemy_army: 'Enemy Army Detected',
      legion_tribute_warning: 'Legion Supply Warning'
    };
    return titles[type];
  }

  _lookupBody(type) {
    // Prefer externalized locale strings when available
    if (en && typeof en[type] === 'string') return en[type];
    const bodies = {
      intro_find_rome: "Welcome, Commander. Rome awaits — you must find Rome before you can send Food. Explore the map to locate Rome's city center.",
      farm_before_rome_warning: "Warning: You've built a Farm but Rome hasn't been found. Your Food has nowhere to go until you find Rome.",
      post_rome_build_guidance: "Well done — you've found Rome! Start building Farms within 5 tiles of Rome so Food arrives fresh.",
      distance_spoil_warning: "This Farm is more than 5 tiles from Rome. Food from here will spoil after 5 rounds in transit.",
      first_food_arrival: "Congratulations! The first Food shipment has reached Rome — your supply lines are working.",
      rome_demand_increase: "Rome's demand for Food has increased. Produce more Farms near Rome.",
      food_spoiled: "Some Food spoiled in transit. Consider building Farms closer to Rome or improving transport routes.",
      first_enemy_army: "Enemy army sighted nearby! Prepare your defenses and secure supply lines.",
      legion_tribute_warning: "Roman legionaries marching to the front need tribute and supplies. Ensure nearby Farms and stockpiles."
    };
    return bodies[type];
  }
}

// Convenience singleton for simple imports
export const Modal = new ModalManager();
