import { currentGame } from "./Game.mjs";
import settingsManager from "./SettingsManager.mjs";
import * as Hex from "./Hex.mjs";
import Unit from "./Unit.mjs";
import * as GameConfig from "./Config.mjs";
import Tile from "./Tile.mjs";

const KEYBOARD_SHORTCUTS = {
  global: {
    Escape: { action: "escape", description: "Close menu or open settings" },
    F1: { action: "open-settings", description: "Open settings" },
  },
  mainGame: {
    w: { action: "unit-wait", description: "Wait with current unit" },
    s: { action: "unit-skip", description: "Skip current unit" },
    F: { action: "build-farm", description: "Build farm (farmer unit)" },
    F2: {
      action: "clear-claims",
      description: "Clear territorial claims display",
    },
    F3: { action: "show-claims", description: "Show territorial claims" },
    u: {
      action: "move-upleft",
      description: "Move unit up-left",
      movement: true,
    },
    i: { action: "move-up", description: "Move unit up", movement: true },
    o: {
      action: "move-upright",
      description: "Move unit up-right",
      movement: true,
    },
    j: {
      action: "move-downleft",
      description: "Move unit down-left",
      movement: true,
    },
    k: { action: "move-down", description: "Move unit down", movement: true },
    l: {
      action: "move-downright",
      description: "Move unit down-right",
      movement: true,
    },
  },
  cityView: {
    Escape: { action: "close-city-view", description: "Close city view" },
  },
  tileView: {
    Escape: { action: "close-tile-view", description: "Close tile view" },
  },
  settings: {
    Escape: { action: "close-settings", description: "Close settings" },
  },
};

export default class InputManager {
  #scene;
  #sceneKey;
  #cursors;
  #shiftKey;
  #isDragging = false;
  #dragStart = { x: 0, y: 0 };
  #camStart = { x: 0, y: 0 };
  #keydownHandler = null;
  #pointerHandlers = {};

  constructor(scene) {
    if (!(scene instanceof globalThis.Phaser.Scene)) {
      throw new Error("InputManager requires a Phaser.Scene instance");
    }

    this.#scene = scene;
    this.#sceneKey = scene.scene.key;
    this.#shiftKey = scene.input.keyboard.addKey(
      globalThis.Phaser.Input.Keyboard.KeyCodes.SHIFT,
    );

    this.#setupSceneListeners();
  }

  #setupSceneListeners() {
    switch (this.#sceneKey) {
      case "mainGameScene":
        this.#setupMainGameListeners();
        break;
      case "city-view":
        this.#setupCityViewListeners();
        break;
      case "tile-view":
        this.#setupTileViewListeners();
        break;
      case "settings":
        this.#setupSettingsListeners();
        break;
      default:
        console.warn(`No input configuration for scene: ${this.#sceneKey}`);
    }
  }

  #setupMainGameListeners() {
    this.#preventContextMenu();
    this.#setupKeyboardListeners();
    this.#setupPointerListeners();
    this.enableKeyboardInput();
  }

  #setupCityViewListeners() {
    this.#keydownHandler = (evt) => {
      if (evt.key === "Escape") {
        currentGame.events.emit("input:close-city-view");
        this.#scene.scene.stop("city-view");
      }
    };
    this.#scene.input.keyboard.on("keydown", this.#keydownHandler);
  }

  #setupTileViewListeners() {
    this.#preventContextMenu("#tile-view");

    this.#keydownHandler = (evt) => {
      if (evt.key === "Escape") {
        currentGame.events.emit("input:close-tile-view");
        this.#scene.scene.stop("tile-view");
      }
    };
    this.#scene.input.keyboard.on("keydown", this.#keydownHandler);
    this.enableKeyboardInput();
  }

  #setupSettingsListeners() {
    this.#keydownHandler = (evt) => {
      if (evt.key === "Escape") {
        currentGame.events.emit("input:close-settings");
      }
    };
    this.#scene.input.keyboard.on("keydown", this.#keydownHandler);
  }

  #preventContextMenu(selector = null) {
    const target = selector
      ? document.querySelector(selector)
      : currentGame.domContainer;
    if (target) {
      target.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    if (this.#scene.input?.manager?.canvas) {
      this.#scene.input.manager.canvas.addEventListener("contextmenu", (e) =>
        e.preventDefault(),
      );
    }
  }

  #setupKeyboardListeners() {
    this.#keydownHandler = (evt) => {
      if (
        evt.ctrlKey &&
        ["r", "R", "1", "2", "3", "4", "5", "6", "7", "8", "9", "I"].includes(
          evt.key,
        )
      ) {
        return;
      }

      evt.preventDefault();

      const shortcuts = {
        ...KEYBOARD_SHORTCUTS.global,
        ...KEYBOARD_SHORTCUTS.mainGame,
      };
      const shortcut = shortcuts[evt.key];

      if (!shortcut) return;

      if (shortcut.movement) {
        this.#handleMovementKey(evt.key);
      } else {
        this.#handleActionKey(shortcut.action);
      }
    };

    this.#scene.input.keyboard.on("keydown", this.#keydownHandler);
  }

  #handleMovementKey(key) {
    if (!Unit.isMovableUnit(currentGame.activeUnit)) return;
    currentGame.events.emit("input:unit-move", {
      direction: key,
      unit: currentGame.activeUnit,
    });
    currentGame.activeUnit.doAction(key);
  }

  #handleActionKey(action) {
    switch (action) {
      case "escape":
        this.#handleEscape();
        break;
      case "open-settings":
        this.#openSettings();
        break;
      case "unit-wait":
        currentGame.events.emit("input:unit-wait");
        currentGame.events.emit("key-pressed", "wait");
        break;
      case "unit-skip":
        currentGame.events.emit("input:unit-skip");
        currentGame.events.emit("key-pressed", "skip");
        break;
      case "build-farm":
        currentGame.events.emit("input:build-farm");
        currentGame.events.emit("key-pressed", "build-farm");
        break;
      case "clear-claims":
        currentGame.events.emit("input:clear-claims");
        currentGame.graphics.gfxClaims?.destroy();
        break;
      case "show-claims":
        currentGame.events.emit("input:show-claims");
        this.#showTerritorialClaims();
        break;
      default:
        currentGame.events.emit(`input:${action}`);
    }
  }

  #handleEscape() {
    const tileMenu = document.getElementById("tile-menu");
    const tileView = document.getElementById("tile-view");

    if (tileMenu && !tileMenu.hidden) {
      currentGame.events.emit("input:close-menu", { menu: "tile-menu" });
      currentGame.events.emit("esc-pressed");
    } else if (tileView && !tileView.hidden) {
      currentGame.events.emit("input:close-menu", { menu: "tile-view" });
      currentGame.events.emit("esc-pressed");
    } else {
      currentGame.events.emit("input:open-settings");
      this.#openSettings();
    }
  }

  #openSettings() {
    if (this.#sceneKey === "mainGameScene") {
      const settingsScene = this.#scene.scene.get("settings");
      if (settingsScene) {
        this.#scene.scene.launch("settings", { returnScene: "mainGameScene" });
        this.#scene.scene.pause();
      } else {
        console.warn("Settings scene not found");
      }
    }
  }

  #showTerritorialClaims() {
    const graphics = (currentGame.graphics.gfxClaims = this.#scene.add
      .graphics({ x: 0, y: 0 })
      .setDepth(GameConfig.depths.territoryLines - 1));

    Hex.Grid.forEach((hex) => {
      if (!Tile.isTile(hex.tile)) return;
      if (!(hex.tile.claims() instanceof Map)) return;

      hex.tile.claims().forEach((intClaim, player) => {
        if (hex.tile.player === player) return;
        graphics.lineStyle(3, player.color);
        graphics.beginPath();

        const [firstCorner, ...otherCorners] = hex.corners.map((point) =>
          GameConfig.lineShift(point, hex, 0.9),
        );
        graphics.moveTo(firstCorner.x, firstCorner.y);
        otherCorners.forEach(({ x, y }) => {
          graphics.lineTo(x, y);
        });

        graphics.closePath();
        graphics.strokePath();
      });
    });
  }

  #setupPointerListeners() {
    const getBaseDragThreshold = () =>
      settingsManager.get("dragThreshold") || 4;

    this.#pointerHandlers.down = (pointer) => {
      this.#dragStart.x = pointer.x;
      this.#dragStart.y = pointer.y;
      this.#camStart.x = this.#scene.cameras.main.scrollX;
      this.#camStart.y = this.#scene.cameras.main.scrollY;
      this.#isDragging = false;

      const baseThreshold = getBaseDragThreshold();
      let dragThreshold;

      switch (pointer.pointerType) {
        case "touch":
          dragThreshold = baseThreshold * 2.5;
          break;
        case "pen":
          dragThreshold = baseThreshold * 2.0;
          break;
        case "mouse":
        default:
          dragThreshold = baseThreshold;
      }

      pointer.customDragThreshold = dragThreshold;
    };

    this.#pointerHandlers.move = (pointer) => {
      if (!pointer.isDown) return;

      const dx = pointer.x - this.#dragStart.x;
      const dy = pointer.y - this.#dragStart.y;
      const dragThreshold =
        pointer.customDragThreshold || getBaseDragThreshold();

      if (
        !this.#isDragging &&
        (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold)
      ) {
        this.#isDragging = true;
        currentGame.events.emit("input:drag-start", {
          x: pointer.x,
          y: pointer.y,
        });
      }

      if (this.#isDragging) {
        const zoom = this.#scene.cameras.main.zoom || 1;
        this.#scene.cameras.main.setScroll(
          this.#camStart.x - dx / zoom,
          this.#camStart.y - dy / zoom,
        );
        currentGame.events.emit("input:drag-move", { dx, dy });
      }
    };

    this.#pointerHandlers.up = (pointer) => {
      if (!this.#isDragging) {
        const hex = Hex.Grid.pointToHex({
          x: pointer.worldX,
          y: pointer.worldY,
        });
        if (Hex.isHex(hex)) {
          currentGame.events.emit("input:hex-click", { hex, pointer });
          currentGame.events.emit("hex-clicked", { hex });
        }
      } else {
        currentGame.events.emit("input:drag-end", {
          x: pointer.x,
          y: pointer.y,
        });
      }

      this.#isDragging = false;
    };

    this.#scene.input.on("pointerdown", this.#pointerHandlers.down);
    this.#scene.input.on("pointermove", this.#pointerHandlers.move);
    this.#scene.input.on("pointerup", this.#pointerHandlers.up);
  }

  update() {
    if (this.#sceneKey === "mainGameScene" && this.#cursors) {
      const cam = this.#scene.cameras.main;
      const speed = this.#shiftKey.isDown ? 25 : 5;

      if (this.#cursors.left.isDown) {
        cam.scrollX -= speed;
      } else if (this.#cursors.right.isDown) {
        cam.scrollX += speed;
      }

      if (this.#cursors.up.isDown) {
        cam.scrollY -= speed;
      } else if (this.#cursors.down.isDown) {
        cam.scrollY += speed;
      }
    }
  }

  enableKeyboardInput() {
    const kbd = this.#scene.input?.keyboard;
    if (typeof (kbd ?? false) !== "object") return;

    kbd.enabled = true;

    if (this.#sceneKey === "mainGameScene") {
      this.#cursors = kbd.createCursorKeys();
    }
  }

  disableKeyboardInput() {
    const kbd = this.#scene.input?.keyboard;
    if (typeof (kbd ?? false) !== "object") return;

    kbd.enabled = false;
    kbd.removeCapture("SPACE");
    kbd.removeCapture("UP");
    kbd.removeCapture("DOWN");
    kbd.removeCapture("LEFT");
    kbd.removeCapture("RIGHT");
  }

  destroy() {
    if (this.#keydownHandler) {
      this.#scene.input.keyboard.off("keydown", this.#keydownHandler);
    }

    if (this.#pointerHandlers.down) {
      this.#scene.input.off("pointerdown", this.#pointerHandlers.down);
      this.#scene.input.off("pointermove", this.#pointerHandlers.move);
      this.#scene.input.off("pointerup", this.#pointerHandlers.up);
    }

    this.#keydownHandler = null;
    this.#pointerHandlers = {};
  }

  static getShortcuts(sceneKey = null) {
    if (sceneKey) {
      return {
        ...KEYBOARD_SHORTCUTS.global,
        ...(KEYBOARD_SHORTCUTS[sceneKey] || {}),
      };
    }
    return KEYBOARD_SHORTCUTS;
  }

  static getAllShortcuts() {
    const all = {};
    Object.entries(KEYBOARD_SHORTCUTS).forEach(([scene, shortcuts]) => {
      Object.entries(shortcuts).forEach(([key, config]) => {
        if (!all[scene]) all[scene] = [];
        all[scene].push({ key, ...config });
      });
    });
    return all;
  }
}

export { KEYBOARD_SHORTCUTS };
