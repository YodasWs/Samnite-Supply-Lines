import World from "../../../json/world.mjs";

export default class Nation {
  #color;
  #frame;
  #index;
  #name;

  constructor({ index }) {
    this.#index = index;
    this.#color = [0x32cd32, 0xff0000, 0x0000ff][index] ?? 0xaaaaaa;
    this.#frame = (index + 1) % 3;
    this.#name = World.NationNames?.[index] ?? "Unknown";
  }

  get color() {
    return this.#color;
  }

  get frame() {
    return this.#frame;
  }

  get index() {
    return this.#index;
  }

  get name() {
    return this.#name;
  }

  static isNation(nation) {
    return nation instanceof Nation;
  }
}
