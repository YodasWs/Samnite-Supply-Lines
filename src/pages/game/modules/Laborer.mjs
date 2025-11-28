import City from "./City.mjs";
import * as Hex from "./Hex.mjs";
import Tile from "./Tile.mjs";

export function generateRomanBritishName() {
  const praenomina = [
    "Gaius",
    "Lucius",
    "Marcus",
    "Quintus",
    "Titus",
    "Publius",
    "Aulus",
    "Sextus",
  ];

  const celticNames = [
    "Bran",
    "Cai",
    "Elen",
    "Rhiannon",
    "Taran",
    "Mabon",
    "Nia",
    "Owain",
  ];

  const cognomina = [
    "Agricola",
    "Felix",
    "Silvanus",
    "Varus",
    "Florus",
    "Crispus",
    "Severus",
    "Vitalis",
  ];

  const epithets = [
    "the Smith",
    "of Londinium",
    "the Younger",
    "the Red",
    "from Camulodunum",
    "the Hunter",
  ];

  const first =
    Math.random() < 0.5
      ? praenomina[Math.floor(Math.random() * praenomina.length)]
      : celticNames[Math.floor(Math.random() * celticNames.length)];

  const last = cognomina[Math.floor(Math.random() * cognomina.length)];
  const epithet =
    Math.random() < 0.3
      ? epithets[Math.floor(Math.random() * epithets.length)]
      : "";

  return `${first} ${last} ${epithet}`.trim();
}

export default class Laborer {
  static FOOD_CONSUMPTION = 2;

  #city;
  #hex;
  #name;
  #tile;
  #type;

  constructor({ city, faction, hex, tile, type } = {}) {
    this.#name = generateRomanBritishName();
    this.#type = type;

    if (City.isCity(city)) {
      this.#city = city;
    }
    if (Hex.isHex(hex) || Hex.isHex(tile?.hex)) {
      this.#hex = hex || tile?.hex;
    }
    if (Tile.isTile(tile) || Tile.isTile(hex?.tile)) {
      this.#tile = tile || hex?.tile;
    }
  }

  get city() {
    return this.#city;
  }

  get hex() {
    return this.#hex;
  }

  get name() {
    return this.#name;
  }

  get tile() {
    return this.#tile;
  }
  set tile(val) {
    if (!Tile.isTile(val)) {
      throw new TypeError(
        "Laborer.tile expects to be assigned object instance of Tile!",
      );
    }
    this.#tile = val;
  }

  get type() {
    return this.#type;
  }

  assignTile(tile) {
    if (!Tile.isTile(tile)) {
      throw new TypeError(
        "Laborer.assignTile expects to be passed object instance of Tile!",
      );
    }
    this.tile = tile;
  }

  static isLaborer(obj) {
    return obj instanceof Laborer;
  }
}
