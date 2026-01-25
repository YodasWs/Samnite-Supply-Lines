import * as Honeycomb from "honeycomb-grid";
import * as GameConfig from "./modules/Config.mjs";

import "./modules/Actions.mjs";
import City from "./modules/City.mjs";
import Faction from "./modules/Faction.mjs";
import Goods from "./modules/Goods.mjs";
import Laborer from "./modules/Laborer.mjs";
import Nation from "./modules/Nation.mjs";
import Tile from "./modules/Tile.mjs";
import Unit from "./modules/Unit.mjs";
import * as Hex from "./modules/Hex.mjs";
import { currentGame } from "./modules/Game.mjs";

import Scenes from "./scenes/scenes.mjs";
import "./views/ActionsView.mjs";

yodasws
	.page("pageGame")
	.setRoute({
		template: "pages/game/game.html",
		canonicalRoute: "/game/",
		route: "/game/?",
	})
	.on("load", () => {
		currentGame.nations = [
			new Nation({
				index: 0,
			}),
		];
		currentGame.players = [
			new Faction({
				index: 0,
			}),
			new Faction({
				index: 1,
			}),
			new Faction({
				index: 2,
			}),
		];

		const game = new Phaser.Game({
			type: Phaser.AUTO,
			...GameConfig.getWindowConfig(),
			zoom: GameConfig.scale,
			backgroundColor: "#71ABFF",
			scene: Object.values(Scenes),
			parent: document.querySelector("main"),
			dom: {
				createContainer: true,
			},
		});

		// Wait for MainGame and MainControls scenes to be ready
		Promise.all([
			new Promise((resolve) => {
				const checkScene = () => {
					if (game.scene.getScene("mainGameScene")) {
						resolve();
					} else {
						setTimeout(checkScene, 50);
					}
				};
				checkScene();
			}),
			new Promise((resolve) => {
				const checkScene = () => {
					if (game.scene.getScene("mainControls")) {
						resolve();
					} else {
						setTimeout(checkScene, 50);
					}
				};
				checkScene();
			}),
		])
			.then(() => {
				currentGame.events.emit("phaser-ready");
			})
			.then(() => {
				game.scene.moveAbove("mainGameScene", "mainControls");

				// Note: MainGame scene is set to autoStart: true
				// but we don't start the game round until user chooses from menu
				// TitleScreen will automatically transition to MainMenu
			});

		Object.assign(currentGame, {
			scenes: game.scene,
			domContainer: game.domContainer,
		});
		game.domContainer.classList.add("game");
	});
