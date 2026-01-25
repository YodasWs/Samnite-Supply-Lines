import { describe, test, beforeEach, mock } from "node:test";
import assert from "./assert.mjs";

import * as Honeycomb from "honeycomb-grid";
import World from "../../../json/world.mjs";
import Faction from "../modules/Faction.mjs";
import City from "../modules/City.mjs";
import * as Hex from "../modules/Hex.mjs";
import Nation from "../modules/Nation.mjs";
import * as GameConfig from "../modules/Config.mjs";
import { currentGame } from "../modules/Game.mjs";
import Tile from "../modules/Tile.mjs";

/**
 * MOCK GAME ENGINE
 * City.mjs calls currentGame.scenes.getScene() and interacts with events.
 * We must define these before the City constructor is invoked.
 */
currentGame.scenes = {
  getScene: () => ({
    add: {
      image: () => ({
        setDepth: () => ({
          setScale: () => ({}),
        }),
      }),
      sprite: () => ({
        setOrigin: () => ({
          setInteractive: () => ({
            on: () => {},
            setAlpha: () => {},
            setVisible: () => {},
          }),
        }),
      }),
    },
    children: { add: () => {} },
  }),
};

// Ensure the event bus exists for the processFood test
if (!currentGame.events) {
  currentGame.events = {
    emit: () => {},
    on: () => {},
  };
}

let testGrid;
let originalGrid;

// Create mockHex class compatible with Hex.Grid
class mockHex extends Honeycomb.defineHex({
  dimensions: GameConfig.tileWidth / 2,
  orientation: Honeycomb.Orientation.FLAT,
  origin: "topLeft",
}) {
  constructor(options) {
    super(options);
    this.tile = new Tile({ hex: this });
    this.city = null;
  }

  get terrain() {
    return {
      terrain: "grass",
      movementCost: 1,
      isWater: false,
    };
  }
}

beforeEach(() => {
  // Store original Grid and inject a small test grid
  originalGrid = Hex.Grid;
  testGrid = new Honeycomb.Grid(
    mockHex,
    Honeycomb.spiral({
      start: { row: 0, col: 0 },
      radius: 2,
    }),
  );
  // Monkey-patch the Grid module to use our test grid
  Object.assign(Hex.Grid, testGrid);
  Hex.Grid.getHex = testGrid.getHex.bind(testGrid);
  Hex.Grid.traverse = testGrid.traverse.bind(testGrid);
  Hex.Grid.forEach = testGrid.forEach.bind(testGrid);
});

function makeNation() {
  return new Nation({ index: 0 });
}

function makeFaction(nation) {
  return new Faction({ nation, index: 0 });
}

describe("City class", () => {
  test("City constructor assigns hex and nation", () => {
    const nation = makeNation();
    const city = new City({ col: 0, row: 0, nation });
    const hex = Hex.Grid.getHex({ row: 0, col: 0 });

    assert.equal(city.hex, hex);
    assert.equal(city.nation, nation);
    assert.equal(hex.city, city);
  });

  test("City.addToQueue pushes valid unit", () => {
    const nation = makeNation();
    const faction = makeFaction(nation);
    const city = new City({ col: 0, row: 0, nation });

    city.addToQueue({ faction, unitType: Object.keys(World.units)[0] });
    assert.equal(city.queue.length, 1);
    assert.equal(city.queue[0].faction, faction);
  });

  test("City.addToQueue rejects invalid unit type", () => {
    const nation = makeNation();
    const faction = makeFaction(nation);
    const city = new City({ col: 0, row: 0, nation });

    city.addToQueue({ faction, unitType: "not-valid-unit" });
    assert.equal(city.queue.length, 0);
  });

  test("City.addToQueue accepts any faction object", () => {
    const nation = makeNation();
    const city = new City({ col: 0, row: 0, nation });

    // addToQueue does not currently validate faction type
    city.addToQueue({ faction: {}, unitType: Object.keys(World.units)[0] });
    assert.equal(city.queue.length, 1);
  });

  test("City.queue stores units when added", () => {
    const nation = makeNation();
    const faction = makeFaction(nation);
    const city = new City({ col: 0, row: 0, nation });

    const unitType = Object.keys(World.units)[0];

    // Add a unit to the queue
    city.addToQueue({ faction, unitType });
    assert.equal(city.queue.length, 1);
    assert.equal(city.queue[0].unitType, unitType);
    assert.equal(city.queue[0].faction, faction);
  });

  test("City.isCity works correctly", () => {
    const nation = makeNation();
    const city = new City({ col: 0, row: 0, nation });

    assert.true(City.isCity(city));
    assert.true(!City.isCity({}));
  });
});
