import * as GameConfig from '../modules/Config.mjs';
import { currentGame } from '../modules/Game.mjs';

const windowConfig = GameConfig.getWindowConfig();
const palette = { // Olive Grove
	background: '#3F4A2F', // olive green
	color: '#F5F1E3', // light parchment
	accent: '#C2A878', // grain gold
	highlight: '#6B5A3C', // wood brown
};
let sceneText;

const sceneKey = 'mainMenu';

export default {
	key: sceneKey,
	preload() {
		currentGame.scenes[sceneKey] = this;
	},
	create() {
		this.cameras.main.setBackgroundColor(palette.background);
		sceneText = this.add.text(0, 100, 'Samnite Supply Lines', {
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
}
