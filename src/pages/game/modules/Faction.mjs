import World from "../../../json/world.mjs";

import City from "./City.mjs";
import Unit from "./Unit.mjs";
import { currentGame } from "./Game.mjs";

export function getFactionColor(index) {
  return [0x32cd32, 0xff0000, 0x0000ff][index] ?? 0xaaaaaa;
}

export function getNextMovableUnit(units, activeUnitIndex) {
  for (let i = 0; i < units.length; i++) {
    const unitIndex = (activeUnitIndex + 1 + i) % units.length;
    if (Unit.isMovableUnit(units[unitIndex])) {
      return units[unitIndex];
    }
  }
  return false;
}

export default class Faction {
  #activeUnitIndex = null;
  #color;
  #index;
  #money = 0;
  #name;
  #units = [];

  constructor({ index }) {
    this.#index = index;
    this.#color = getFactionColor(index);
    this.#name = World?.FactionNames[index];

    this.#setupEventListeners();
  }

  #setupEventListeners() {
    currentGame.events.on("goods-moved", (evt) => {
      const { goods, promise } = evt.detail;
      if (goods.faction !== this || !City.isCity(goods.hex.city)) return;
      promise.then(() => {
        this.#money += World.ResourceValues[goods.goodsType] * goods.num;
        goods.destroy();
      });
    });

    currentGame.events.on("unit-moved", (evt) => {
      if (evt.detail.faction === this || evt.detail.unit.faction === this) {
        evt.detail.promise.then(() => this.checkEndTurn());
      }
    });
  }

  get activeUnit() {
    if (
      Number.isInteger(this.#activeUnitIndex) &&
      this.#activeUnitIndex >= 0 &&
      this.#activeUnitIndex <= this.#units.length
    ) {
      return this.#units[this.#activeUnitIndex];
    }
    return undefined;
  }
  set activeUnit(val) {
    if (Number.isInteger(val) && val >= 0) {
      this.#activeUnitIndex = val % this.#units.length;
      return;
    }
    if (val === null) {
      this.#activeUnitIndex = null;
    }
  }

  get color() {
    return this.#color;
  }

  get index() {
    return this.#index;
  }

  get money() {
    return this.#money;
  }
  set money(val) {
    if (!Number.isFinite(val) || val < 0) {
      throw new TypeError(
        "Faction.money expects to be assigned a positive number!",
      );
    }
    this.#money = val;
  }

  get name() {
    return this.#name;
  }

  get nation() {
    return currentGame.nations[0];
  }

  get units() {
    return this.#units;
  }
  set units(val) {
    if (!Array.isArray(val)) {
      throw new TypeError("Faction.units expects to be assigned an Array!");
    }
    this.#units = val.filter(Unit.isActivatableUnit);
  }

  addUnit(unitType, hex) {
    this.#units.push(
      new Unit(unitType, {
        hex,
        faction: this,
      }),
    );
  }

  checkEndTurn() {
    const hasMovableUnit = this.activateNext();
    if (!hasMovableUnit) {
      currentGame.events.emit("end-turn", { faction: this });
    }
  }

  activateUnit(intUnit = this.#activeUnitIndex) {
    if (this.#units.length === 0) {
      currentGame.events.emit("end-turn", { faction: this });
      return false;
    }
    if (!Unit.isActivatableUnit(this.#units[intUnit])) {
      return false;
    }
    this.#units[intUnit].activate();
    this.#activeUnitIndex = intUnit;
    return true;
  }

  activateNext() {
    const nextUnit = getNextMovableUnit(this.#units, this.#activeUnitIndex);
    if (Unit.isMovableUnit(nextUnit)) {
      this.#activeUnitIndex = this.#units.indexOf(nextUnit);
      nextUnit.activate();
      return true;
    }
    return false;
  }

  static isFaction(faction) {
    return faction instanceof Faction;
  }
}
