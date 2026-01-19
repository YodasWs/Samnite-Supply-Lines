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

const offsets = {
	spoilage: {
		x: 0,
		y: -32,
	},
	num: {
		x: 12,
		y: 0,
	},
};

class GoodsViewDetail {
	#container
	#hex
	#scene
	#spoilageOffset = 32;
	#spoilageSprite
	#sprite
	#numText
	#moving = false;
	#goodsType

	constructor(goods, scene) {
		this.#hex = goods.hex;
		const x = this.#hex.x;
		const y = this.#hex.y;
		this.#scene = scene;
		this.#sprite = scene.add.sprite(x, y, `goods.${goods.goodsType}`)
			.setDepth(Depths.goods);
		this.#numText = scene.add.text(x + offsets.num.x, y + offsets.num.y, goods.num.toString(), {
			font: '20pt Trebuchet MS',
			align: 'right',
			color: 'white',
			stroke: 'black',
			weight: 'bold',
			strokeThickness: 4,
		}).setDepth(Depths.goods + 1);
		this.#container = [this.#sprite, this.#numText];

		if (goods.goodsType === 'food') {
			// TODO: Change spoilage color
			this.#spoilageSprite = scene.add.sprite(x + offsets.spoilage.x, y + offsets.spoilage.y, 'spoilage-timer')
				.setDepth(Depths.goods).setScale(0.6).setTintFill(0x00ff00);
			this.#container.push(this.#spoilageSprite);
			goods.events.on('rounds-updated', (evt) => {
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

		scene.cameras.getCamera('mini').ignore(this.#container);

		this.setVisible(FogOfWar.isHexVisible(currentGame.players[0], goods.hex));

		// Set up event listeners
		const fnOnNumUpdated = (evt) => {
			this.#numText.setText(evt.detail.num.toString());
		};
		const fnOnZoomChanged = (zoom) => {
			switch (zoom) {
				case 0.4:
					this.#numText.setFontSize('30pt');
					break;
				case 0.5:
					this.#numText.setFontSize('30pt');
					break;
				case 0.7:
					this.#numText.setFontSize('30pt');
					break;
				case 1:
					this.#numText.setFontSize('30pt');
					break;
			}
		};

		goods.events.on('num-updated', fnOnNumUpdated);
		scene.events.on('zoom-changed', fnOnZoomChanged);
		goods.events.once('destroyed', (evt) => {
			destroyGoodsSprite(goods);
			// Clean up event listeners
			goods.events.off('num-updated', fnOnNumUpdated);
			scene.events.off('zoom-changed', fnOnZoomChanged);
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
		this.#numText.setVisible(this.#sprite.visible && !val);
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
		this.#numText.setX(val + offsets.num.x);
		if (this.#goodsType === 'food') {
			this.#spoilageSprite.setX(val + offsets.spoilage.x);
		}
	}
	set y(val) {
		this.#sprite.setY(val);
		this.#numText.setY(val + offsets.num.y);
		if (this.#goodsType === 'food') {
			this.#spoilageSprite.setY(val + offsets.spoilage.y);
		}
	}

	destroy() {
		this.#container.forEach(obj => obj.destroy());
	}

	setPosition(x, y) {
		this.x = x;
		this.y = y;
	}

	setVisible(visible) {
		if (typeof visible !== 'boolean') {
			throw new TypeError('GoodsViewDetail.setVisible expects a boolean!');
		}
		this.#sprite.setVisible(visible);
		this.#numText.setVisible(!this.#moving && visible);
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
// TODO: Need to also tween the num text and spoilage sprite
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
