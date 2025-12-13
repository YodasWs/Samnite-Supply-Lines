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
	dom ??= {
		menus: document.getElementById('action-menus'),
		tileMenu: document.getElementById('tile-menu'),
		unitMenu: document.getElementById('unit-menu'),
	};
});

function buildActionButton(div, context, action) {
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
}

function OpenUnitActionMenu(evt) {
	const unit = evt.detail?.unit;
	if (!Unit.isUnit(unit) || currentGame.activeUnit !== unit) return;
	if (typeof Element === 'undefined' || !(currentGame.domContainer instanceof Element)) {
		return;
	}

	CloseUnitActionMenu();

	// Build menu
	// TODO: Move this to the Scene or View

	const faction = currentGame.currentPlayer;
	const context = {
		menu: 'unit-actions-menu',
		hex: unit.hex,
		unit,
		faction,
	};

	ActionHandler.getAvailableActions(context).forEach(buildActionButton.bind(null, dom.unitMenu, context));
	dom.unitMenu.removeAttribute('hidden');
	dom.menus.removeAttribute('hidden');
}
currentGame.events.on('unit-activated', OpenUnitActionMenu);

function CloseUnitActionMenu() {
	dom.unitMenu.innerHTML = '';
	dom.unitMenu.setAttribute('hidden', true);
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

	const possibleActions = ActionHandler.getAvailableActions(context);

	// No valid actions
	if (possibleActions.length === 0) {
		return;
	}

	// Auto-execute if only one action and it's not a menu-worthy one
	if (possibleActions.length === 1 && possibleActions[0].key !== 'activateUnit') {
		possibleActions[0].execute(context);
		return;
	}

	currentGame.activeTile = hex;

	// Build menu
	possibleActions.forEach(buildActionButton.bind(null, dom.tileMenu, context));

	// Add cancel button
	const cancel = document.createElement('button');
	cancel.innerHTML = 'Cancel';
	cancel.addEventListener('click', CloseTileMenu);
	cancel.style.pointerEvents = 'auto';
	dom.tileMenu.appendChild(cancel);

	dom.tileMenu.style.zIndex = 1;
	dom.tileMenu.removeAttribute('hidden');
	dom.menus.removeAttribute('hidden');
}
currentGame.events.on('hex-clicked', OpenTileMenu);

function CloseTileMenu(evt) {
	currentGame.activeTile = null;
	dom.tileMenu.setAttribute('hidden', true);
	dom.tileMenu.innerHTML = '';
}
currentGame.events.on('esc-pressed', CloseTileMenu);
currentGame.events.on('center-map', CloseTileMenu);
