const MINIMUM_DISPLAY_TIME = 2000;

export default class TitleScreen extends Phaser.Scene {
  constructor() {
    super({ key: "title-screen" });
  }

  preload() {
    this.load.image("title-background", "img/title-background.png");
    this.load.image("game-logo", "img/game-logo.png");
  }

  create() {
    const { width, height } = this.cameras.main;

    this.add
      .image(width / 2, height / 2, "title-background")
      .setDisplaySize(width, height);

    const logo = this.add
      .image(width / 2, height / 3, "game-logo")
      .setOrigin(0.5);
    const maxLogoWidth = width * 0.8;
    if (logo.width > maxLogoWidth) {
      logo.setScale(maxLogoWidth / logo.width);
    }

    this.add
      .text(width / 2, height * 0.65, "Loading...", {
        fontSize: "32px",
        fontFamily: "Arial, sans-serif",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const barWidth = 400;
    const barHeight = 30;
    const barX = (width - barWidth) / 2;
    const barY = height * 0.72;

    const progressBarBg = this.add.graphics();
    progressBarBg.fillStyle(0x222222, 0.8);
    progressBarBg.fillRect(barX, barY, barWidth, barHeight);

    const progressBar = this.add.graphics();

    const updateProgressBar = (progress) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ff00, 1);
      progressBar.fillRect(
        barX + 2,
        barY + 2,
        (barWidth - 4) * progress,
        barHeight - 4,
      );
    };

    let loadProgress = 0;
    const startTime = Date.now();
    updateProgressBar(0);

    const loadingInterval = setInterval(() => {
      loadProgress = Math.min(loadProgress + 0.05, 1.0);
      updateProgressBar(loadProgress);
      if (loadProgress >= 1.0) clearInterval(loadingInterval);
    }, 100);

    const transitionToMainMenu = () => {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MINIMUM_DISPLAY_TIME - elapsedTime);
      setTimeout(() => this.scene.start("mainMenu"), remainingTime);
    };

    const checkLoadingComplete = setInterval(() => {
      if (loadProgress >= 1.0) {
        clearInterval(checkLoadingComplete);
        transitionToMainMenu();
      }
    }, 50);

    this.input.once("pointerdown", () => {
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime >= MINIMUM_DISPLAY_TIME / 2) {
        clearInterval(loadingInterval);
        clearInterval(checkLoadingComplete);
        loadProgress = 1.0;
        updateProgressBar(1.0);
        this.scene.start("mainMenu");
      }
    });
  }
}
