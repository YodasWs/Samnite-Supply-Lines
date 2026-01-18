import { depths as Depths } from '../modules/Config.mjs';
import { currentGame } from '../modules/Game.mjs';
import { FogOfWar } from './TileView.mjs';
import * as Hex from '../modules/Hex.mjs';

const HexGoodsGrids = new Map(); // key: Hex instance → Map of Goods instance → GoodsViewDetail

const goodsSprites = new Map(); // key: Goods instance → GoodsViewDetail
const GoodsSpriteOptions = {
	ease: 'Linear',
	duration: 1000,
	yoyo: false,
};

class GoodsViewDetail {
	#hex
	#scene
	#spoilageOffset = 32;
	#spoilageSprite
	#sprite
	#moving = false;
	#goodsType

	constructor(goods, scene) {
		this.#hex = goods.hex;
		this.#scene = scene;
		this.#sprite = scene.add.sprite(this.#hex.x, this.#hex.y, `goods.${goods.goodsType}`)
			.setDepth(Depths.goods);
		if (goods.goodsType === 'food') {
			// TODO: Change spoilage color
			this.#spoilageSprite = scene.add.sprite(this.#hex.x, this.#hex.y - this.#spoilageOffset, 'spoilage-timer')
				.setDepth(Depths.goods).setScale(0.6).setTint(0x00ff00);
			goods.events.on('rounds-updated', (evt) => {
				console.log('Sam, rounds-updated called', evt.detail.percentage);
				const percentage = evt.detail.percentage;
				if (percentage <= 20) {
					this.#spoilageSprite.setTintFill(0xff0000);
				} else if (percentage <= 60) {
					this.#spoilageSprite.setTintFill(0xffff00);
				} else {
					this.#spoilageSprite.setTintFill(0x00ff00);
				}
			});
		}
		this.#goodsType = goods.goodsType;
		this.setVisible(FogOfWar.isHexVisible(currentGame.players[0], goods.hex));

		goods.events.on('destroyed', (evt) => {
			destroyGoodsSprite(goods);
		});
	}

	get hex() {
		return this.#hex;
	}

	get moving() {
		return this.#moving;
	}
	set moving(val) {
		if (typeof val !== 'boolean') {
			throw new TypeError('GoodsViewDetail.moving expects to be assigned a boolean!');
		}
		if (this.#goodsType === 'food') {
			this.#spoilageSprite.setVisible(this.#sprite.visible && !val);
		}
		this.#moving = val;
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

	set x(val) {
		this.#sprite.setX(val);
		if (this.#goodsType === 'food') {
			this.#spoilageSprite.setX(val);
		}
	}
	set y(val) {
		this.#sprite.setY(val);
		if (this.#goodsType === 'food') {
			this.#spoilageSprite.setY(val - this.#spoilageOffset);
		}
	}

	destroy() {
		this.#sprite.destroy();
		if (this.#goodsType === 'food') {
			this.#spoilageSprite.destroy();
		}
	}

	setVisible(visible) {
		if (typeof visible !== 'boolean') {
			throw new TypeError('GoodsViewDetail.setVisible expects a boolean!');
		}
		this.#sprite.setVisible(visible);
		if (this.#goodsType === 'food') {
			this.#spoilageSprite.setVisible(!this.#moving && visible);
		}
	}

	update(hex) {
		if (Hex.isHex(hex)) {
			this.#hex = hex;
		}
	}
}

export function registerGoodsToView(goods, scene) {
	if (!goodsSprites.has(goods)) {
		goodsSprites.set(goods, new GoodsViewDetail(goods, scene));
	}
	return goodsSprites.has(goods);
}

const gridWidth = 5;

export function renderGoods() {
	// Separate Goods by Hex
	HexGoodsGrids.clear();
	goodsSprites.entries().forEach(([goods, detail]) => {
		if (goods.moving) return;
		// Filter out deleted Goods
		if (goods.deleted) {
			destroyGoodsSprite(goods);
			return;
		}
		if (!HexGoodsGrids.has(goods.hex)) {
			HexGoodsGrids.set(goods.hex, new Map());
		}
		HexGoodsGrids.get(goods.hex).set(goods, detail);
	});

	// Move Goods that have changed Hex
	goodsSprites.forEach((detail, goods) => {
		if (detail.x !== goods.hex.x || detail.y !== goods.hex.y) {
			detail.moving = true;
			const promise = moveGoodsSprite(goods, detail.hex);
			detail.update(goods.hex);
			promise.then(() => {
				detail.moving = false;
				goods.events.emit('moved', { promise });
				currentGame.events.emit('goods-moved', { goods, promise });
			});
		}
	});

	// Align Goods in their Hexes
	HexGoodsGrids.forEach((goodsMap, hex) => {
		goodsMap.forEach((detail, goods) => {
			if (goods.deleted) {
				goodsMap.delete(goods);
			}
		});
		if (goodsMap.size === 0) return;
		// TODO: Replace with a better grid alignment that handles moving Goods
		gridAlign(goodsMap.values().filter(d => !d.moving), {
			position: Phaser.Display.Align.CENTER,
			width: gridWidth,
			cellHeight: 32,
			cellWidth: 32,
			x: hex.x - 32 * (goodsMap.size < gridWidth ? goodsMap.size : gridWidth) / 2,
			y: hex.y - 16 * Math.ceil(goodsMap.size / gridWidth),
		});
	});
}

function gridAlign(iterable, {
	x = 0,
	y = 0,
	width = 1,
	cellWidth = 32,
	cellHeight = 32,
} = {}) {
	let index = 0;

	for (const item of iterable) {
		const col = index % width;
		const row = Math.floor(index / width);

		const baseX = x + col * cellWidth + cellWidth / 2;
		const baseY = y + row * cellHeight + cellHeight / 2;

		// If the item is a composite view, let it decide how to position itself
		if (typeof item.setPosition === 'function') {
			item.setPosition(baseX, baseY);
		} else {
			// Otherwise assume it has x/y setters
			item.x = baseX;
			item.y = baseY;
		}

		index++;
	}
}

currentGame.events.on('hex-visible', (evt) => {
	const { hex } = evt.detail;
	goodsSprites.forEach((detail, goods) => {
		if (detail.hex === hex) detail.setVisible(true);
	});
});

currentGame.events.on('hex-hidden', (evt) => {
	const { hex } = evt.detail;
	goodsSprites.forEach((detail, goods) => {
		if (detail.hex === hex) detail.setVisible(false);
	});
});

// TODO: Need to tween to where the goods will be positioned on the new hex, not to the center
function moveGoodsSprite(goods, oldHex) {
	const detail = goodsSprites.get(goods);
	if (!detail) return;

	const duration = 800;

	const oldVisible = FogOfWar.isHexVisible(currentGame.players[0], oldHex);
	const newVisible = FogOfWar.isHexVisible(currentGame.players[0], goods.hex);

	if (!oldVisible && !newVisible) {
		detail.x = goods.hex.x;
		detail.y = goods.hex.y;
		detail.setVisible(false);
		return Promise.resolve();
	}

	if (oldVisible && !newVisible) {
		detail.setVisible(true);
		return new Promise((resolve) => {
			detail.scene.tweens.add({
				targets: detail.sprite,
				x: (goods.hex.x + oldHex.x) / 2,
				y: (goods.hex.y + oldHex.y) / 2,
				ease: 'Quad.out',
				duration: duration / 2,
				yoyo: false,
				onComplete(tween) {
					detail.x = goods.hex.x;
					detail.y = goods.hex.y;
					detail.setVisible(false);
					tween.destroy();
					resolve();
				},
			});
		});
	}

	if (!oldVisible && newVisible) {
		return new Promise((resolve) => {
			detail.x = (goods.hex.x + oldHex.x) / 2;
			detail.y = (goods.hex.y + oldHex.y) / 2;
			detail.setVisible(false);
			setTimeout(resolve, duration / 2);
		}).then(() => {
			detail.setVisible(true);
			return new Promise((resolve) => {
				detail.scene.tweens.add({
					targets: detail.sprite,
					x: goods.hex.x,
					y: goods.hex.y,
					ease: 'Linear',
					duration: duration / 2,
					yoyo: false,
					onComplete(tween) {
						tween.destroy();
						resolve();
					},
				});
			});
		});
	}

	return new Promise((resolve) => {
		detail.setVisible(true);
		detail.scene.tweens.add({
			targets: detail.sprite,
			x: goods.hex.x,
			y: goods.hex.y,
			ease: 'Quad.out',
			duration,
			yoyo: false,
			onComplete(tween) {
				tween.destroy();
				resolve();
			},
		});
	});
}

export function destroyGoodsSprite(goods) {
	if (!goods.deleted) return; // Only remove view if Goods is truly deleted
	if (!goodsSprites.has(goods)) return; // Already removed
	const detail = goodsSprites.get(goods);
	detail.setVisible(false);
	detail.destroy();
	goodsSprites.delete(goods);
}
