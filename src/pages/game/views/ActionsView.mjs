import { currentGame } from '../modules/Game.mjs';

import { ActionHandler } from '../modules/Actions.mjs';
import * as Hex from '../modules/Hex.mjs';
import Tile from '../modules/Tile.mjs';
import Unit, * as UnitUtils from '../modules/Unit.mjs';
import { FogOfWar } from '../views/TileView.mjs';

if (typeof globalThis.document === 'undefined') {
	// Mock document for non-DOM environments
	globalThis.document = {
		add() {
			return this;
		},
		addEventListener() {
			return this;
		},
		appendChild() {
			return this;
		},
		createElement() {
			return this;
		},
		getElementById() {
			return this;
		},
		querySelector() {
			return this;
		},
		querySelectorAll() {
			return [];
		},
		remove() {
			return this;
		},
		removeAttribute() {
			return this;
		},
		setAttribute() {
			return this;
		},
	};
	globalThis.document.classList = globalThis.document;
	globalThis.document.style = globalThis.document;
}

let dom = null;

currentGame.events.on('phaser-ready', () => {
	dom ??= document.getElementById('tile-menu');
});

function OpenUnitActionMenu(evt) {
	const unit = evt.detail?.unit;
	if (!Unit.isUnit(unit) || currentGame.activeUnit !== unit) return;
	if (typeof Element === 'undefined' || !(currentGame.domContainer instanceof Element)) {
		return;
	}

	// Build menu
	// TODO: Move this to the Scene or View
	currentGame.domContainer.innerHTML = '';
	const div = document.createElement('div');
	div.classList.add('unit-actions-menu');

	const faction = currentGame.currentPlayer;
	const context = {
		menu: 'unit-actions-menu',
		hex: unit.hex,
		unit,
		faction,
	};

	ActionHandler.getAvailableActions(context).forEach((action) => {
		const button = document.createElement('button');
		if (currentGame.scenes.mainGame.textures.exists(`actions.${action.key}`)) {
			button.append(currentGame.scenes.mainGame.textures.get(`actions.${action.key}`).getSourceImage());
		} else {
			button.innerHTML = action.label;
		}
		button.addEventListener('click', () => {
			action.execute(context);
		});
		if (typeof action.description === 'string' && action.description !== '') {
			button.setAttribute('title', action.description);
		}
		button.style.pointerEvents = 'auto';
		div.appendChild(button);
	});

	currentGame.domContainer.appendChild(div);
	currentGame.domContainer.style.zIndex = 1;
}
currentGame.events.on('unit-activated', OpenUnitActionMenu);

function CloseUnitActionMenu() {
	currentGame.domContainer.innerHTML = '';
	currentGame.domContainer.style.zIndex = 0;
}
currentGame.events.on('unit-deactivated', CloseUnitActionMenu);
currentGame.events.on('unit-moving', CloseUnitActionMenu);

currentGame.events.on('doing-action', () => {
	CloseUnitActionMenu();
	CloseTileMenu();
});

function OpenTileMenu(evt) {
	const hex = evt.detail?.hex || evt.detail?.unit?.hex;
	if (!Hex.isHex(hex) || !Tile.isTile(hex.tile)) return;
	if (!FogOfWar.isHexExplored(currentGame.players[0], hex)) return;

	CloseTileMenu();

	const unit = currentGame.activeUnit;
	const faction = currentGame.currentPlayer;
	const context = {
		menu: 'tile-menu',
		hex,
		unit,
		faction,
	};

	const possibleActions = ActionHandler.getAvailableActions(context)

	// No valid actions
	if (possibleActions.length === 0) {
		return;
	}

	// Auto-execute if only one action and it's not a menu-worthy one
	if (possibleActions.length === 1 && possibleActions[0].key !== 'activateUnit') {
		possibleActions[0].execute(context);
		return;
	}

	// Build menu
	possibleActions.forEach((action) => {
		const button = document.createElement('button');
		button.innerHTML = action.label;
		button.addEventListener('click', () => {
			action.execute(context);
		});
		if (typeof action.description === 'string' && action.description !== '') {
			button.setAttribute('title', action.description);
		}
		button.style.pointerEvents = 'auto';
		dom.appendChild(button);
	});

	// Add cancel button
	const cancel = document.createElement('button');
	cancel.innerHTML = 'Cancel';
	cancel.addEventListener('click', CloseTileMenu);
	cancel.style.pointerEvents = 'auto';
	dom.appendChild(cancel);

	dom.style.zIndex = 1;
	dom.removeAttribute('hidden');
}
currentGame.events.on('hex-clicked', OpenTileMenu);

function CloseTileMenu(evt) {
	dom.setAttribute('hidden', true);
	dom.innerHTML = '';
}
currentGame.events.on('esc-pressed', CloseTileMenu);
