import World from '../../../json/world.mjs';
import { Tester } from './Game.mjs';

// Thanks to Microsoft Copilot for this name generator!
export function generateRomanName() {
	const nameParts = [];
	for (const namePart in World.LaborerNames) {
		const rand = Math.random();
		for (const key in World.LaborerNames[namePart]) {
			if (rand < Number.parseFloat(key)) {
				nameParts.push(World.LaborerNames[namePart][key]);
				break;
			}
		}
	}

	return nameParts.join(' ');
}

export default class Laborer {
	#name
	#type

	constructor({
		city,
		faction,
		hex,
		tile,
		type,
	}) {
		this.#name = generateRomanName();
		this.#type = type;

		if (Tester.isCity(city)) {
			Object.defineProperty(this, 'city', {
				enumerable: true,
				get: () => city,
			});
		}
		if (Tester.isHex(hex) || Tester.isHex(tile?.hex)) {
			Object.defineProperty(this, 'hex', {
				enumerable: true,
				get: () => hex || tile?.hex,
			});
		}
		if (Tester.isTile(tile) || Tester.isTile(hex?.tile)) {
			Object.defineProperty(this, 'tile', {
				enumerable: true,
				get: () => tile || hex?.tile,
			});
		}
	}

	get name() {
		return this.#name;
	}

	assignTile(tile) {
		if (!Tester.isTile(tile)) {
			throw new TypeError('Laborer.assignTile expects to be passed object instance of Tile!');
		}
		// TODO: Check if Tile has already been assigned and is at its capacity
		this.tile = tile;
	}

	static FOOD_CONSUMPTION = 2;

	static isLaborer(obj) {
		return obj instanceof Laborer;
	}
}
