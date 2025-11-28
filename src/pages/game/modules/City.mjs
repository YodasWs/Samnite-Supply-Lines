import World from "../../../json/world.mjs";
import * as Honeycomb from "honeycomb-grid";
import * as GameConfig from "./Config.mjs";

import Laborer from "./Laborer.mjs";
import Nation from "./Nation.mjs";
import { Grid } from "./Hex.mjs";
import { currentGame } from "./Game.mjs";

export default class City {
  #hex;
  #laborers = new Set();
  #level;
  #nation;
  #queue = [];
  #sprite;

  constructor({ col, row, level = 1, nation } = {}) {
    if (!Nation.isNation(nation)) {
      throw new TypeError("City expects to be assigned a Nation!");
    }

    const scene = currentGame.scenes.getScene("mainGameScene");
    const thisHex = Grid.getHex({ row, col });
    thisHex.tile.setImprovement("destroy");

    this.#hex = thisHex;
    this.#level = level;
    this.#nation = nation;
    this.#sprite = scene.add
      .image(thisHex.x, thisHex.y, "cities", nation.frame)
      .setDepth(GameConfig.depths.cities)
      .setScale(0.8);
    thisHex.city = this;

    this.#claimTerritory();
  }

  #claimTerritory() {
    Grid.traverse(
      Honeycomb.spiral({
        start: [this.#hex.q, this.#hex.r],
        radius: 1,
      }),
    ).forEach((hex) => {
      hex.tile.claimTerritory(this.#nation, 100);
    });

    Grid.traverse(
      Honeycomb.ring({
        center: [this.#hex.q, this.#hex.r],
        radius: 2,
      }),
    ).forEach((hex) => {
      if (hex.terrain.isWater) {
        hex.tile.claimTerritory(this.#nation, 50);
      }
    });
  }

  get hex() {
    return this.#hex;
  }

  get laborers() {
    return this.#laborers;
  }
  set laborers(val) {
    if (!(val instanceof Laborer)) {
      throw new TypeError(
        "City.laborers expects to be assigned object instance of Laborer!",
      );
    }
    this.#laborers.add(val);
  }

  get level() {
    return this.#level;
  }

  get nation() {
    return this.#nation;
  }

  get queue() {
    return this.#queue;
  }

  get sprite() {
    return this.#sprite;
  }

  addToQueue({ faction, unitType }) {
    if (!(unitType in World.units)) {
      console.warn(`City production queue: Unknown unit key ${unitType}`);
      return;
    }
    this.#queue.push({ unitType, faction });
  }

  static isCity(city) {
    return city instanceof City;
  }
}
