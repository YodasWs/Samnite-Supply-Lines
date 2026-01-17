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

currentGame.events.on('goods-destroyed', (evt) => {
	destroyGoodsSprite(evt.detail.goods);
});

class GoodsViewDetail {
	#hex
	#scene
	#sprite
	#moving = false;

	constructor(goods, scene) {
		this.#hex = goods.hex;
		this.#scene = scene;
		this.#sprite = scene.add.sprite(this.#hex.x, this.#hex.y, `goods.${goods.goodsType}`)
			.setDepth(Depths.goods);
		this.#sprite.setVisible(FogOfWar.isHexVisible(currentGame.players[0], goods.hex));
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
	}
	set y(val) {
		this.#sprite.setX(val);
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
		Phaser.Actions.GridAlign([...goodsMap.values()].filter(d => !d.moving).map(d => d.sprite), {
			position: Phaser.Display.Align.CENTER,
			width: gridWidth,
			cellHeight: 32,
			cellWidth: 32,
			x: hex.x - 32 * (goodsMap.size < gridWidth ? goodsMap.size : gridWidth) / 2,
			y: hex.y - 16 * Math.ceil(goodsMap.size / gridWidth),
		});
	});
}

currentGame.events.on('hex-visible', (evt) => {
	const { hex } = evt.detail;
	goodsSprites.forEach((detail, goods) => {
		if (detail.hex === hex) detail.sprite.setVisible(true);
	});
});

currentGame.events.on('hex-hidden', (evt) => {
	const { hex } = evt.detail;
	goodsSprites.forEach((detail, goods) => {
		if (detail.hex === hex) detail.sprite.setVisible(false);
	});
});

function moveGoodsSprite(goods, oldHex) {
	const detail = goodsSprites.get(goods);
	if (!detail) return;

	const duration = 800;

	const oldVisible = FogOfWar.isHexVisible(currentGame.players[0], oldHex);
	const newVisible = FogOfWar.isHexVisible(currentGame.players[0], goods.hex);

	if (!oldVisible && !newVisible) {
		detail.sprite.setX(goods.hex.x).setY(goods.hex.y).setVisible(false);
		return Promise.resolve();
	}

	if (oldVisible && !newVisible) {
		detail.sprite.setVisible(true);
		return new Promise((resolve) => {
			detail.scene.tweens.add({
				targets: detail.sprite,
				x: (goods.hex.x + oldHex.x) / 2,
				y: (goods.hex.y + oldHex.y) / 2,
				ease: 'Quad.out',
				duration: duration / 2,
				yoyo: false,
				onComplete(tween) {
					detail.sprite.setX(goods.hex.x).setY(goods.hex.y).setVisible(false);
					tween.destroy();
					resolve();
				},
			});
		});
	}

	if (!oldVisible && newVisible) {
		return new Promise((resolve) => {
			detail.sprite.setX((goods.hex.x + oldHex.x) / 2).setY((goods.hex.y + oldHex.y) / 2).setVisible(false);
			setTimeout(resolve, duration / 2);
		}).then(() => {
			detail.sprite.setVisible(true);
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
		detail.sprite.setVisible(true);
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
	detail.sprite.setVisible(false);
	detail.sprite.destroy();
	goodsSprites.delete(goods);
}
