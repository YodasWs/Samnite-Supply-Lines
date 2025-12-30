import * as GameConfig from '../modules/Config.mjs';

import * as Hex from './Hex.mjs';
import Movable from './Movable.mjs';
import { currentGame } from './Game.mjs';

export default class Goods extends Movable {
	#goodsType;
	#num;
	#rounds = 0;
	#start;
	#target;

	constructor(goodsType, {
		hex,
		num = 1,
	}) {
		if (!Goods.isValidGoodsType(goodsType)) {
			throw new TypeError(`Unknown Goods type '${goodsType}'`);
		}

		super({
			base: GameConfig.World.ResourceTransporter,
			hex,
		});
		this.#goodsType = goodsType;
		this.#num = num;
		this.#start = hex;

		currentGame.events.on('goods-moved', (evt) => {
			const { goods, promise } = evt.detail;
			if (goods !== this) return;
			if (Hex.isHex(this.#target) && this.hex !== this.#target) return;
			promise.finally(() => {
				this.destroy();
			});
		});
	}

	get goodsType() {
		return this.#goodsType;
	}

	get num() {
		return this.#num;
	}
	set num(val) {
		if (!Number.isInteger(val) || val < 0) {
			throw new TypeError('Goods.num expects to be assigned a nonnegative integer!');
		}
		this.#num = val;
	}

	get rounds() {
		return this.#rounds;
	}
	set rounds(val) {
		if (!Number.isInteger(val) || val < 0) {
			throw new TypeError('Goods.rounds expects to be assigned a nonnegative integer!');
		}
		this.#rounds = val;
		// Limit lifespan of Food goods on the board
		if (this.#goodsType === 'food' && this.#rounds >= Goods.MaxFoodRounds) {
			// Emit spoil event before destroying so UI can react
			try {
				currentGame.events.emit('food-spoiled', { goods: this });
			} catch (e) {
				console.warn('Could not emit food-spoiled event', e);
			}
			this.destroy();
		}
	}

	// Override destroy to ensure "food-spoiled" can be emitted from other codepaths too
	destroy() {
		try {
			if (this.#goodsType === 'food' && this.#rounds >= Goods.MaxFoodRounds) {
				currentGame.events.emit('food-spoiled', { goods: this });
			}
		} catch (e) {
			console.warn('Error emitting food-spoiled in destroy', e);
		}
		super.destroy();
	}

	get start() {
		return this.#start;
	}

	setPath(targetHex, Grid = Hex.Grid) {
		this.#target = super.setPath(targetHex, Grid) !== null && targetHex;
	}

	static isGoods(goods) {
		return goods instanceof Goods;
	}

	static isValidGoodsType(type) {
		return typeof (GameConfig.World.goods[type] ?? false) === 'object';
	}

	static MaxFoodRounds = 5;
}
