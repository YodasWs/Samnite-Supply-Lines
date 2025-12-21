import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from '../modules/Config.mjs';

import * as Hex from './Hex.mjs';
import City from './City.mjs';
import Laborer from './Laborer.mjs';
import Tile from './Tile.mjs';
import Unit from './Unit.mjs';
import { currentGame } from './Game.mjs';

// TODO: Base action object:
/*
action = {
	key: 'nameOfAction',
	text: ({ hex, unit, faction }) => 'User-facing Action Name',
	sprite: 'optional-sprite-key',
	isValidOption: ({ hex, unit, faction }) => true/false,
	doAction: ({ hex, unit, faction }) => {
		// Perform action
	},
}
/**/

class GameAction {
	constructor(definition) {
		[
			'command',
			'execute',
			'isValid',
			'label',
		].forEach((prop) => {
			if (prop in definition) {
				this[`#${prop}`] = definition[prop];
				delete definition[prop];
			}
		});
		Object.assign(this, definition);
	}

	isValid(context) {
		if (typeof context.menu === 'string' && !this.showIn.includes(context.menu)) return false;
		if (this['#isValid'] === true) return true;
		if (Array.isArray(this.unitTypes) &&
			(!Unit.isUnit(context.unit) || !this.unitTypes.includes(context.unit.unitType))) return false;
		const fn = ActionValidators[this['#isValid']];
		return typeof fn === 'function' ? fn(context) : true;
	}

	execute(context) {
		if (!this.isValid(context)) {
			return false;
		}
		// Execute emits 'doing-action' event before running
		const fnExecute = ActionExecutors[this['#execute']];
		if (typeof fnExecute === 'function') {
			return Promise.try(() => {
				currentGame.events.emit('doing-action');
			}).then(() => {
				fnExecute(context);
			});
		}
		// Command does not emit 'doing-action' event!
		const fnCommand = ActionExecutors[this['#command']];
		if (typeof fnCommand === 'function') {
			return Promise.try(() => {
				fnCommand(context);
			});
		}
		console.warn(`No executor for action ${this.key}`);
	}

	get label() {
		const fn = ActionLabels[this['#label']];
		if (typeof fn === 'function') return fn(context);
		return this['#label'];
	}
}

const ActionRegistry = new Map();

function loadActions(actionDefs) {
	actionDefs.forEach(def => {
		const action = new GameAction(def);
		ActionRegistry.set(action.key, action);
	});
}
loadActions(GameConfig.World.actions);

const ActionValidators = {
	currentPlayerTurn() {
		return currentGame.currentPlayer === currentGame.players[0];
	},
	hexTileValid({ hex }) {
		return Hex.isHex(hex) && Tile.isTile(hex.tile);
	},
	isCityTile({ hex }) {
		return City.isCity(hex.city);
	},
	isFarmBuildable({ hex, unit }) {
		if (!ActionValidators.hexTileValid({ hex })) return false;
		return unit.unitType === 'farmer' && hex.tile.isValidImprovement('farm');
	},
	isHexControlled({ hex, faction }) {
		return hex.tile.faction === faction;
	},
	isLegalMove({ hex, unit }) {
		return hex !== unit.hex && Hex.IsLegalMove(hex, unit);
	},
};

const ActionExecutors = {
	buildFarm({ unit, hex }) {
		if (hex !== unit.hex) {
			unit.setAction('build-farm', { hex });
			return;
		}
		hex.tile.setImprovement('farm', unit.faction);
		hex.tile.laborers = new Laborer({
			hex,
			faction: unit.faction,
			type: 'farmer',
		});
		unit.destroy();
	},
	centerMap() {
		currentGame.events.emit('center-map');
	},
	endTurn() {
		currentGame.events.emit('end-turn');
	},
	skip({ unit }) {
		unit.deactivate(true);
	},
	startCityView({ hex }) {
		currentGame.scenes.start('city-view', { hex });
	},
	startMoveTo({ unit, hex }) {
		unit ??= currentGame.activeUnit;
		hex ??= currentGame.activeTile ?? unit.hex;
		if (unit.setPath(hex)) {
			unit.moveOneTurn();
		}
	},
	startTileView({ hex }) {
		currentGame.scenes.start('tile-view', { hex });
	},
	wait({ unit }) {
		unit.deactivate();
	},
};

// Store any labels that need to be generated dynamically by function
const ActionLabels = {
};

export class ActionHandler {
	static handle(key, context) {
		const action = ActionRegistry.get(key);
		if (!(action instanceof GameAction)) return false;
		if (!action.isValid(context)) return false;
		action.execute(context);
		return true;
	}

	static getAvailableActions(context) {
		return [...ActionRegistry.values()].filter(action => action.isValid(context));
	}
}

currentGame.events.on('key-pressed', (evt) => {
	const unit = currentGame.activeUnit;
	if (!Unit.isUnit(unit)) return;
	ActionHandler.handle(evt.detail, {
		unit,
		hex: currentGame.activeTile ?? unit.hex,
		faction: unit.faction,
	});
});
