import * as GameConfig from '../modules/Config.mjs';

import City from './City.mjs';
import Unit from './Unit.mjs';
import { currentGame } from './Game.mjs';

export function getFactionColor(index) {
	return [
		0x32cd32,
		0xff0000,
		0x0000ff,
	][index] ?? 0xaaaaaa;
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

let activeUnitIndex = null;

// Each Human/AI Player controls a Faction
export default class Faction {
	#color
	#index
	#money = 0;
	#name
	// TODO: Convert #units to a Set
	#units = [];

	constructor({
		index,
	}) {
		if (!Number.isInteger(index) || index < 0) {
			throw new TypeError('Faction.constructor expects index to be a nonnegative integer!');
		}
		this.#color = getFactionColor(index);
		this.#index = index;
		this.#name = GameConfig.World?.FactionNames[index];

		currentGame.events.on('goods-moved', (evt) => {
			const { goods, promise } = evt.detail;
			if (goods.faction !== this || !City.isCity(goods.hex.city)) return;
			// Deliver Food to City
			promise.then(() => {
				console.log('Sam, Faction received', goods.num, 'goods for', GameConfig.World.ResourceValues[goods.goodsType], 'each');
				this.money += GameConfig.World.ResourceValues[goods.goodsType] * goods.num;
				console.log('Sam, Faction new money total:', this.money);
			});
		});

		currentGame.events.on('unit-moved', (evt) => {
			if (evt.detail.faction === this || evt.detail.unit.faction === this) {
				evt.detail.promise.then(this.checkEndTurn.bind(this));
			}
		});
	}

	get color() {
		return this.#color;
	}
	get index() {
		return this.#index;
	}
	get name() {
		return this.#name;
	}
	get nation() {
		return currentGame.nations[0];
	}

	get money() {
		return this.#money;
	}
	set money(val) {
		if (!Number.isFinite(val) || val < 0) {
			throw new TypeError('Faction.money expects to be assigned a nonnegative number!');
		}
		this.#money = val;
	}

	get activeUnit() {
		if (Number.isInteger(activeUnitIndex) && activeUnitIndex >= 0 && activeUnitIndex <= units.length) {
			return units[activeUnitIndex];
		}
		return undefined;
	}
	set activeUnit(val) {
		if (val === null) {
			activeUnitIndex = null;
			return;
		}
		if (!Number.isInteger(val) || val < 0) {
			throw new TypeError('Faction.activeUnit expects to be assigned a nonnegative number!');
		}
		activeUnitIndex = val % this.#units.length;
	}

	get units() {
		return this.#units;
	}
	set units(val) {
		if (!Array.isArray(val)) {
			throw new TypeError('Faction.units expects to be assigned an Array!');
		}
		this.#units = val.filter(Unit.isActivatableUnit);
	}

	addUnit(unitType, hex) {
		this.#units.push(new Unit(unitType, {
			hex,
			faction: this,
		}));
	}

	checkEndTurn() {
		const hasMovableUnit = this.activateNext();
		if (!hasMovableUnit) {
			currentGame.events.emit('end-turn', { faction: this });
		}
	}

	activateUnit(intUnit = activeUnitIndex) {
		if (this.#units.length === 0) {
			currentGame.events.emit('end-turn', { faction: this });
			return false;
		}
		if (!Unit.isActivatableUnit(this.#units[intUnit])) {
			return false;
		}
		this.#units[intUnit].activate();
		activeUnitIndex = intUnit;
		return true;
	}

	activateNext() {
		const nextUnit = getNextMovableUnit(this.#units, activeUnitIndex);
		if (Unit.isMovableUnit(nextUnit)) {
			activeUnitIndex = this.#units.indexOf(nextUnit);
			nextUnit.activate();
			return true;
		}
		return false;
	}

	static isFaction(faction) {
		return faction instanceof Faction;
	}
}
