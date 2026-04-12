import * as Honeycomb from 'honeycomb-grid';
import * as GameConfig from './modules/Config.mjs';

import './modules/Actions.mjs';
import City from './modules/City.mjs';
import Faction from './modules/Faction.mjs';
import Goods from './modules/Goods.mjs';
import Laborer from './modules/Laborer.mjs';
import Nation from './modules/Nation.mjs';
import Tile from './modules/Tile.mjs';
import Unit from './modules/Unit.mjs';
import * as Hex from './modules/Hex.mjs';
import { currentGame } from './modules/Game.mjs';

import Scenes from './scenes/scenes.mjs';
import './views/ActionsView.mjs';

const windowConfig = GameConfig.getWindowConfig();
const palette = { // Olive Grove
	background: '#3F4A2F', // olive green
	color: '#F5F1E3', // light parchment
	accent: '#C2A878', // grain gold
	highlight: '#6B5A3C', // wood brown
};

yodasws.page('pageGame').setRoute({
	template: 'pages/game/game.html',
	canonicalRoute: '/game/',
	route: '/game/?',
}).on('load', () => {
	const game = new Phaser.Game({
		type: Phaser.AUTO,
		...GameConfig.getWindowConfig(),
		zoom: GameConfig.scale,
		backgroundColor: '#000000',
		scene: {
			key: 'title-screen',
			preload() {
			},
			create() {
				this.cameras.main.setBackgroundColor(palette.background);
				this.add.text(0, 100, 'Samnite Supply Lines', {
					fontFamily: 'Trebuchet MS',
					fontSize: '96px',
					fontStyle: 'bold',
					color: palette.color,
					stroke: '#3A2F2A',
					strokeThickness: 0,
					align: 'center',
					fixedWidth: windowConfig.width,
				});
			},
			update() {
			},
		},
		parent: document.querySelector('main'),
		dom: {
			createContainer: true,
		},
	});

	Promise.all(Object.values(Scenes).map((scene) => {
		game.scene.add(scene.key, scene, scene.autoStart || false);
		// This jumps to the Main Menu Scene
		if (scene.autoStart) {
			return new Promise((resolve) => {
				game.events.once(`scene-created-${scene.key}`, resolve);
			});
		}
		return true;
	})).then(() => {
		game.scene.stop('title-screen');
		currentGame.events.emit('phaser-ready');
	}).then(() => {
	});

	Object.assign(currentGame, {
		scenes: game.scene,
		domContainer: game.domContainer,
	});
	game.domContainer.classList.add('game');
});
