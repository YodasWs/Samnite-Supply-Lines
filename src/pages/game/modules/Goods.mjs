import * as GameConfig from '../modules/Config.mjs';

import * as Hex from './Hex.mjs';
import Movable from './Movable.mjs';
import { currentGame, Emitter } from './Game.mjs';

export default class Goods extends Movable {
	#emitter = new Emitter();
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

		this.events.on('moved', (evt) => {
			if (Hex.isHex(this.#target) && this.hex === this.#target) {
				evt.detail.promise.finally(() => {
					this.destroy();
				});
			}
		});
	}

	get events() {
		return this.#emitter;
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
		if (val === 0) {
			this.destroy();
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
		if (this.#goodsType === 'food') {
			this.events.emit('rounds-updated', {
				rounds: this.#rounds,
				maxRounds: this.MaxFoodRounds,
				percentage: (Goods.MaxFoodRounds - this.#rounds) / Goods.MaxFoodRounds * 100,
			});
			if (this.#rounds >= Goods.MaxFoodRounds) {
				this.destroy();
			}
		}
	}

	get start() {
		return this.#start;
	}

	destroy() {
		super.destroy();
		currentGame.events.emit('goods-destroyed', { goods: this });
		this.events.emit('destroyed');
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
