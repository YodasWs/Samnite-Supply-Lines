import City from './City.mjs';
import * as Hex from './Hex.mjs';
import Tile from './Tile.mjs';
import World from '../../../json/world.mjs';

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

function Laborer({
	city,
	faction,
	hex,
	tile,
	type,
} = {}) {
	const name = generateRomanName();
	if (City.isCity(city)) {
		Object.defineProperty(this, 'city', {
			enumerable: true,
			get: () => city,
		});
	}
	if (Hex.isHex(hex) || Hex.isHex(tile?.hex)) {
		Object.defineProperty(this, 'hex', {
			enumerable: true,
			get: () => hex || tile?.hex,
		});
	}
	if (Tile.isTile(tile) || Tile.isTile(hex?.tile)) {
		Object.defineProperty(this, 'tile', {
			enumerable: true,
			get: () => tile || hex?.tile,
		});
	}
	Object.defineProperties(this, {
		name: {
			enumerable: true,
			get: () => name,
		},
		type: {
			enumerable: true,
			get: () => type,
		},
	});
}
Object.assign(Laborer.prototype, {
	assignTile(tile) {
		if (!Tile.isTile(tile)) {
			throw new TypeError('Laborer.assignTile expects to be passed object instance of Tile!');
		}
		// TODO: Check if Tile has already been assigned and is at its capacity
		this.tile = tile;
	},
});
Laborer.FOOD_CONSUMPTION = 2;
Laborer.isLaborer = function isLaborer(obj) {
	return obj instanceof Laborer;
};
export default Laborer;
