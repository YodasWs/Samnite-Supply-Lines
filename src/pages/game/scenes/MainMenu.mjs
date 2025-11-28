import { hasSavedGame, loadGame } from "../modules/SettingsManager.mjs";

const GAME_VERSION = "0.0.1-alpha";

const MENU_BUTTONS = [
  { label: "New Game", action: "newGame", enabled: () => true },
  {
    label: "Continue Game",
    action: "continueGame",
    enabled: () => hasSavedGame(),
  },
  { label: "Achievements", action: "achievements", enabled: () => true },
  { label: "Help", action: "help", enabled: () => true },
  { label: "Settings", action: "settings", enabled: () => true },
  { label: "Exit", action: "exit", enabled: () => true },
];

export default class MainMenu extends Phaser.Scene {
  constructor() {
    super({ key: "mainMenu" });
  }

  create() {
    const { width, height } = this.cameras.main;

    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x0f3460, 1);
    graphics.fillRect(0, 0, width, height);

    this.add
      .text(width / 2, height * 0.15, "EMPIRES 4X", {
        fontSize: "72px",
        fontFamily: "Georgia, serif",
        color: "#e94560",
        stroke: "#000000",
        strokeThickness: 6,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.23, "Build. Expand. Conquer.", {
        fontSize: "24px",
        fontFamily: "Arial, sans-serif",
        color: "#ffffff",
        style: "italic",
      })
      .setOrigin(0.5);

    const buttonStartY = height * 0.35;
    const buttonSpacing = 70;
    const buttonWidth = 300;
    const buttonHeight = 50;

    this.menuButtons = MENU_BUTTONS.map((config, index) => {
      const y = buttonStartY + index * buttonSpacing;
      return this.createButton({
        x: width / 2,
        y,
        width: buttonWidth,
        height: buttonHeight,
        label: config.label,
        enabled: config.enabled(),
        onClick: () => this.handleButtonClick(config.action),
      });
    });

    this.add
      .text(width - 20, height - 20, `v${GAME_VERSION}`, {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#888888",
      })
      .setOrigin(1, 1);

    this.input.keyboard.on("keydown-ESC", () => this.handleButtonClick("exit"));

    for (let i = 0; i < Math.min(MENU_BUTTONS.length, 9); i++) {
      const config = MENU_BUTTONS[i];
      this.input.keyboard.on(`keydown-${i + 1}`, () => {
        if (config.enabled()) this.handleButtonClick(config.action);
      });
    }
  }

  createButton({ x, y, width, height, label, enabled, onClick }) {
    const container = { graphics: null, text: null, enabled };

    const bg = this.add.graphics();
    const bgColor = enabled ? 0x533483 : 0x333333;
    const borderColor = enabled ? 0x7b2cbf : 0x555555;

    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
    bg.lineStyle(2, borderColor, 1);
    bg.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8);
    container.graphics = bg;

    const text = this.add
      .text(x, y, label, {
        fontSize: "28px",
        fontFamily: "Arial, sans-serif",
        color: enabled ? "#ffffff" : "#666666",
      })
      .setOrigin(0.5);
    container.text = text;

    if (enabled) {
      const hitArea = new Phaser.Geom.Rectangle(
        x - width / 2,
        y - height / 2,
        width,
        height
      );
      text.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

      text.on("pointerover", () => {
        bg.clear();
        bg.fillStyle(0x7b2cbf, 1);
        bg.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
        bg.lineStyle(3, 0xe94560, 1);
        bg.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8);
        text.setScale(1.05);
      });

      text.on("pointerout", () => {
        bg.clear();
        bg.fillStyle(0x533483, 1);
        bg.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
        bg.lineStyle(2, 0x7b2cbf, 1);
        bg.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8);
        text.setScale(1.0);
      });

      text.on("pointerdown", () => {
        bg.clear();
        bg.fillStyle(0x9d4edd, 1);
        bg.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
        text.setScale(0.98);
      });

      text.on("pointerup", () => {
        onClick();
        bg.clear();
        bg.fillStyle(0x7b2cbf, 1);
        bg.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
        bg.lineStyle(3, 0xe94560, 1);
        bg.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8);
        text.setScale(1.05);
      });
    }

    return container;
  }

  handleButtonClick(action) {
    switch (action) {
      case "newGame":
        console.info("Starting new game...");
        this.scene.start("mainGameScene");
        break;

      case "continueGame":
        if (hasSavedGame()) {
          console.info("Loading saved game...");
          const gameState = loadGame();
          if (gameState) {
            this.scene.start("mainGameScene");
          } else {
            this.showError("Failed to load saved game");
          }
        }
        break;

      case "achievements":
        console.info("Opening achievements...");
        this.showComingSoon("Achievements");
        break;

      case "help":
        console.info("Opening help...");
        this.showComingSoon("Help");
        break;

      case "settings":
        console.info("Opening settings...");
        this.scene.launch("settings", { returnScene: "mainMenu" });
        this.scene.pause();
        break;

      case "exit":
        console.info("Exiting to homepage...");
        if (typeof yodasws !== "undefined" && yodasws.router) {
          yodasws.router.go("/");
        } else {
          window.location.href = "/";
        }
        break;

      default:
        console.warn(`Unknown action: ${action}`);
    }
  }

  showComingSoon(feature) {
    const { width, height } = this.cameras.main;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(0, 0, width, height);

    const box = this.add.graphics();
    box.fillStyle(0x1a1a2e, 1);
    box.fillRoundedRect(width / 2 - 200, height / 2 - 100, 400, 200, 10);
    box.lineStyle(3, 0xe94560, 1);
    box.strokeRoundedRect(width / 2 - 200, height / 2 - 100, 400, 200, 10);

    const text = this.add
      .text(width / 2, height / 2 - 20, `${feature}\nComing Soon!`, {
        fontSize: "32px",
        fontFamily: "Arial, sans-serif",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5);

    const closeText = this.add
      .text(width / 2, height / 2 + 50, "Click to close", {
        fontSize: "18px",
        fontFamily: "Arial, sans-serif",
        color: "#888888",
      })
      .setOrigin(0.5);

    const cleanup = () => {
      bg.destroy();
      box.destroy();
      text.destroy();
      closeText.destroy();
    };

    this.input.once("pointerdown", cleanup);
    this.input.keyboard.once("keydown", cleanup);
  }

  showError(message) {
    console.error(message);
  }
}
