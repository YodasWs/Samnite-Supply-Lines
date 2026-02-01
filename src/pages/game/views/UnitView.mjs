import * as GameConfig from '../modules/Config.mjs';
import { currentGame } from '../modules/Game.mjs';
import { FogOfWar } from '../views/TileView.mjs';

const unitSprites = new Map(); // key: Unit instance → UnitViewDetail

const offsetY = -30;

class UnitViewDetail {
	#hex
	#scene
	#sprite

	constructor(unit, scene) {
		this.#hex = unit.hex;
		this.#scene = scene;
		this.#sprite = scene.add.sprite(this.#hex.x, this.#hex.y + offsetY, `unit.${unit.unitType}`)
			.setTint(0x383838).setVisible(false)
			.setDepth(GameConfig.depths.inactiveUnits);
		this.#sprite.setScale(GameConfig.unitWidth / this.#sprite.width);
	}

	get hex() {
		return this.#hex;
	}

	get scene() {
		return this.#scene;
	}

	get sprite() {
		return this.#sprite;
	}

	get x() {
		return this.#hex.x;
	}
	get y() {
		return this.#hex.y;
	}

	update(hex) {
		this.#hex = hex;
	}
}

export function registerUnitToView(unit, scene) {
	if (!unitSprites.has(unit)) {
		unitSprites.set(unit, new UnitViewDetail(unit, scene));
	}
	return unitSprites.has(unit);
}

// TODO: Only call this when the player's fog of war changes
export function renderUnits() {
	unitSprites.forEach((detail, unit) => {
		if (unit.deleted) {
			destroyUnitSprite(unit);
			return;
		}

		if (detail.x !== unit.hex.x || detail.y !== unit.hex.y) {
			const promise = moveUnitSprite(unit, detail.hex);
			detail.update(unit.hex);
			promise.then(() => {
				console.log('Sam, emitting unit-moved');
				currentGame.events.emit('unit-moved', { unit, promise });
			});
		}

		// TODO: Do we want to show the last known position of enemy units?
		if (FogOfWar.isHexVisible(currentGame.players[0], unit.hex)) {
			detail.sprite.setVisible(true);

			if (currentGame.activeUnit === unit) {
				detail.sprite.setTint(0xffffff).setDepth(GameConfig.depths.activeUnit);
			} else {
				detail.sprite.setTint(0x383838).setDepth(GameConfig.depths.inactiveUnits);
			}
		} else {
			detail.sprite.setVisible(false);
		}
	});
}

function moveUnitSprite(unit, priorHex) {
	const detail = unitSprites.get(unit);
	if (!detail) return;

	return new Promise((resolve) => {
		currentGame.events.emit('unit-moving', { unit, priorHex });
		detail.scene.tweens.add({
			targets: detail.sprite,
			x: unit.hex.x,
			y: unit.hex.y + offsetY,
			ease: 'Quad.out',
			duration: 800,
			yoyo: false,
			onComplete(tween) {
				tween.destroy();
				resolve();
			},
		});
	});
}

function destroyUnitSprite(unit) {
	if (!unitSprites.has(unit)) {
		return;
	}
	const detail = unitSprites.get(unit);
	detail.sprite.setVisible(false);
	detail.sprite.destroy();
	unitSprites.delete(unit);
}
currentGame.events.on('unit-destroyed', (evt) => {
	destroyUnitSprite(evt.detail.unit);
});
