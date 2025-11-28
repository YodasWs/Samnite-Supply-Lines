import World from "../../../json/world.mjs";
import * as Honeycomb from "honeycomb-grid";

import * as Hex from "./Hex.mjs";
import City from "./City.mjs";
import Laborer from "./Laborer.mjs";
import Tile from "./Tile.mjs";
import Unit from "./Unit.mjs";
import { currentGame } from "./Game.mjs";

class GameAction {
  #execute;
  #isValid;
  #label;

  constructor(definition) {
    ["execute", "isValid", "label"].forEach((prop) => {
      if (prop in definition) {
        this[`#${prop}`] = definition[prop];
        delete definition[prop];
      }
    });
    Object.assign(this, definition);
  }

  isValid(context) {
    if (
      typeof context.menu === "string" &&
      !this.showIn?.includes(context.menu)
    )
      return false;
    if (this.#isValid === true) return true;
    if (
      Array.isArray(this.unitTypes) &&
      (!Unit.isUnit(context.unit) ||
        !this.unitTypes.includes(context.unit.unitType))
    )
      return false;
    const fn = ActionValidators[this.#isValid];
    return typeof fn === "function" ? fn(context) : true;
  }

  execute(context) {
    const fn = ActionExecutors[this.#execute];
    if (!this.isValid(context)) {
      return false;
    }
    if (typeof fn === "function") {
      return Promise.resolve()
        .then(() => {
          currentGame.events.emit("doing-action");
        })
        .then(() => {
          fn(context);
        });
    }
    console.warn(`No executor for action ${this.key}`);
  }

  get label() {
    const fn = ActionLabels[this.#label];
    if (typeof fn === "function") return fn();
    return this.#label;
  }
}

const ActionRegistry = new Map();

class ActionManager {
  static #instance;

  constructor() {
    if (ActionManager.#instance) {
      return ActionManager.#instance;
    }
    ActionManager.#instance = this;
    this.#loadActions();
    this.#setupEventListeners();
  }

  #loadActions() {
    World.actions?.forEach((def) => {
      const action = new GameAction(def);
      ActionRegistry.set(action.key, action);
    });
  }

  #setupEventListeners() {
    currentGame.events.on("key-pressed", (evt) => {
      const key = evt.detail;
      const unit = currentGame.activeUnit;
      if (!Unit.isUnit(unit)) return;
      const context = { unit, hex: unit.hex, faction: unit.faction };
      this.handle(key, context);
    });
  }

  handle(key, context) {
    const action = ActionRegistry.get(key);
    if (!(action instanceof GameAction)) return false;
    if (!action.isValid(context)) return false;
    action.execute(context);
    return true;
  }

  getAvailableActions(context) {
    return [...ActionRegistry.values()].filter((action) =>
      action.isValid(context)
    );
  }

  static getInstance() {
    if (!ActionManager.#instance) {
      new ActionManager();
    }
    return ActionManager.#instance;
  }
}

export class ActionHandler {
  static handle(key, context) {
    return ActionManager.getInstance().handle(key, context);
  }

  static getAvailableActions(context) {
    return ActionManager.getInstance().getAvailableActions(context);
  }
}

new ActionManager();

const ActionValidators = {
  currentPlayerTurn() {
    return currentGame.currentPlayer === currentGame.players[0];
  },
  hexTileValid({ hex }) {
    return Hex.isHex(hex) && Tile.isTile(hex.tile);
  },
  isCityTile({ hex }) {
    return City.isCity(hex.city);
  },
  isFarmBuildable({ hex, unit }) {
    if (hex !== unit.hex) return false;
    if (!ActionValidators.hexTileValid({ hex })) return false;
    return unit.unitType === "farmer" && hex.tile.isValidImprovement("farm");
  },
  isHexControlled({ hex, faction }) {
    return hex.tile.faction === faction;
  },
  isLegalMove({ hex, unit }) {
    return hex !== unit.hex && Hex.IsLegalMove(hex, unit);
  },
};

const ActionExecutors = {
  buildFarm({ unit, hex }) {
    hex.tile.setImprovement("farm", unit.faction);
    hex.tile.laborers = new Laborer({
      hex,
      faction: unit.faction,
      type: "farmer",
    });
    unit.destroy();
  },
  endTurn() {
    currentGame.events.emit("end-turn");
  },
  skip({ unit }) {
    unit.deactivate(true);
  },
  startCityView({ hex }) {
    currentGame.scenes.start("city-view", { hex });
  },
  startMoveTo({ unit, hex }) {
    if (unit.setPath(hex)) {
      unit.moveOneTurn();
    }
  },
  startTileView({ hex }) {
    currentGame.scenes.start("tile-view", { hex });
  },
  wait({ unit }) {
    unit.deactivate();
  },
};

const ActionLabels = {};
