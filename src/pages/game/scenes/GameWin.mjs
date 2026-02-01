import * as GameConfig from '../modules/Config.mjs';
import { currentGame } from '../modules/Game.mjs';

const sceneKey = 'gameWin';

const windowConfig = GameConfig.getWindowConfig();

currentGame.events.on('game-won!', () => {
	currentGame.scenes.start(sceneKey);
});

const palettes = [
	{ // Imperial Triumph
		background: '#2B1F14', // deep umber
		accent: '#C9A86A', // muted gold
		color: '#F2E9D0', // parchment ivory
		highlight: '#8C6E3C', // bronze
	},
	{ // Marble Hall
		background: '#E5E1DA', // warm marble
		color: '#3A2F2A', // dark stone
		accent: '#A38F7B', // aged limestone
		highlight: '#6E5A4F', // shadowed marble vein
	},
	{ // Legion Standard
		background: '#7A0A0A', // legionary red
		color: '#F7E7C6', // aged-parchment
		accent: '#D4A017', // standard pole-gold
		shadow: '#3A0000', // deep red-black
	},
	{ // Night Watch
		background: '#1C1C1C', // charcoal
		color: '#F0EDE6', // soft ivory
		accent: '#A67C52', // bronze
		highlight: '#4A3A2A', // dark bronze
	},
	{ // Olive Grove
		background: '#3F4A2F', // olive green
		color: '#F5F1E3', // light parchment
		accent: '#C2A878', // grain gold
		highlight: '#6B5A3C', // wood brown
	},
];

let sceneText;

export default {
	key: sceneKey,
	preload() {
		currentGame.scenes[sceneKey] = this;
	},
	create() {
		const palette = palettes[Math.floor(Math.random() * palettes.length)];
		const fontSize = 96;
		this.cameras.main.setBackgroundColor(palette.background);
		sceneText = this.add.text(0, (windowConfig.height - fontSize) / 2, 'You Win!', {
			fontFamily: 'Trebuchet MS',
			fontSize: `${fontSize}px`,
			fontStyle: 'bold',
			color: palette.color,
			stroke: '#3A2F2A',
			strokeThickness: 0,
			align: 'center',
			fixedHeight: windowConfig.height,
			fixedWidth: windowConfig.width,
		});

		this.input.keyboard.on('keydown', (evt) => {
			let newPalette;
			switch (evt.key) {
				case '1':
					newPalette = 0;
					break;
				case '2':
					newPalette = 1;
					break;
				case '3':
					newPalette = 2;
					break;
				case '4':
					newPalette = 3;
					break;
				case '5':
					newPalette = 4;
					break;
			}
			if (Number.isInteger(newPalette) && newPalette in palettes) {
				this.cameras.main.setBackgroundColor(palettes[newPalette].background);
				sceneText.setColor(palettes[newPalette].color);
			}
		});

		setTimeout(() => {
			this.input.on('pointerup', () => {
				this.scene.start('mainMenu');
			});
		}, 500);

		document.querySelector('main').classList.add('game-win');

		currentGame.scenes.stop('mainGameScene');
		currentGame.scenes.stop('mainControls');
	},
	update() {
	},
};
