const STORAGE_PREFIX = "empires4x_";
const SCHEMA_VERSION = 1;

const DEFAULT_SETTINGS = {
  _version: SCHEMA_VERSION,
  _lastModified: null,
  movementKeys: "default",
  customMovementKeys: {
    upLeft: "U",
    up: "I",
    upRight: "O",
    downLeft: "J",
    down: "K",
    downRight: "L",
  },
  dragThreshold: 4,
  masterVolume: 0.7,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  showGrid: true,
  showTerritoryBorders: true,
  animationSpeed: 1.0,
  highContrast: false,
  reducedMotion: false,
  screenReaderMode: false,
};

const StorageState = {
  OPERATIONAL: "operational",
  DEGRADED: "degraded",
  FAILED: "failed",
};

class SettingsManager {
  #settings = null;
  #storageState = StorageState.OPERATIONAL;
  #failureCount = 0;
  #lastFailureTime = 0;
  #writeDebounceTimer = null;

  static FAILURE_THRESHOLD = 3;
  static RECOVERY_TIMEOUT = 30000;
  static WRITE_DEBOUNCE_MS = 500;

  constructor() {
    this.#initializeSettings();
  }

  #initializeSettings() {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}settings`);

      if (stored) {
        const parsed = JSON.parse(stored);

        if (parsed._version !== SCHEMA_VERSION) {
          console.warn(
            `Settings schema outdated (v${parsed._version}). Migrating to v${SCHEMA_VERSION}`
          );
          this.#settings = this.#migrateSchema(parsed);
        } else {
          this.#settings = { ...DEFAULT_SETTINGS, ...parsed };
        }
      } else {
        this.#settings = { ...DEFAULT_SETTINGS };
        this.#persistSettings();
      }

      this.#storageState = StorageState.OPERATIONAL;
      this.#failureCount = 0;
    } catch (error) {
      console.error("Failed to load settings from localStorage:", error);
      this.#handleStorageFailure();
      this.#settings = { ...DEFAULT_SETTINGS };
    }
  }

  #handleStorageFailure() {
    this.#failureCount++;
    this.#lastFailureTime = Date.now();

    if (this.#failureCount >= SettingsManager.FAILURE_THRESHOLD) {
      this.#storageState = StorageState.FAILED;
      console.error("localStorage circuit breaker OPEN - too many failures");
    } else {
      this.#storageState = StorageState.DEGRADED;
    }
  }

  #canAttemptStorage() {
    if (this.#storageState === StorageState.OPERATIONAL) {
      return true;
    }

    if (this.#storageState === StorageState.FAILED) {
      const timeSinceFailure = Date.now() - this.#lastFailureTime;
      if (timeSinceFailure >= SettingsManager.RECOVERY_TIMEOUT) {
        console.info("Attempting localStorage recovery...");
        this.#storageState = StorageState.DEGRADED;
        this.#failureCount = 0;
        return true;
      }
      return false;
    }

    return true;
  }

  #persistSettings() {
    if (!this.#canAttemptStorage()) {
      console.warn("localStorage unavailable - settings not persisted");
      return;
    }

    clearTimeout(this.#writeDebounceTimer);
    this.#writeDebounceTimer = setTimeout(() => {
      try {
        this.#settings._lastModified = new Date().toISOString();
        const serialized = JSON.stringify(this.#settings);
        localStorage.setItem(`${STORAGE_PREFIX}settings`, serialized);

        if (this.#storageState !== StorageState.OPERATIONAL) {
          console.info("localStorage recovered");
          this.#storageState = StorageState.OPERATIONAL;
          this.#failureCount = 0;
        }
      } catch (error) {
        console.error("Failed to persist settings:", error);
        this.#handleStorageFailure();
      }
    }, SettingsManager.WRITE_DEBOUNCE_MS);
  }

  #migrateSchema(oldSettings) {
    return {
      ...DEFAULT_SETTINGS,
      ...oldSettings,
      _version: SCHEMA_VERSION,
    };
  }

  get(key) {
    if (!this.#settings) {
      this.#initializeSettings();
    }

    const keys = key.split(".");
    let value = this.#settings;

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }

    return value;
  }

  set(key, value) {
    if (!this.#settings) {
      this.#initializeSettings();
    }

    if (typeof key !== "string" || key.length === 0) {
      console.error("Invalid setting key");
      return false;
    }

    if (!this.#validateSetting(key, value)) {
      console.error(`Invalid value for setting "${key}":`, value);
      return false;
    }

    const keys = key.split(".");
    let target = this.#settings;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in target) || typeof target[k] !== "object") {
        target[k] = {};
      }
      target = target[k];
    }

    target[keys[keys.length - 1]] = value;
    this.#persistSettings();

    return true;
  }

  #validateSetting(key, value) {
    switch (key) {
      case "dragThreshold":
        return typeof value === "number" && value >= 1 && value <= 50;

      case "movementKeys":
        return ["default", "wasd", "arrows", "custom"].includes(value);

      case "masterVolume":
      case "musicVolume":
      case "sfxVolume":
        return typeof value === "number" && value >= 0 && value <= 1;

      case "animationSpeed":
        return typeof value === "number" && value >= 0.1 && value <= 3.0;

      case "showGrid":
      case "showTerritoryBorders":
      case "highContrast":
      case "reducedMotion":
      case "screenReaderMode":
        return typeof value === "boolean";

      default:
        return true;
    }
  }

  reset() {
    this.#settings = { ...DEFAULT_SETTINGS };
    this.#persistSettings();
  }

  resetKey(key) {
    if (key in DEFAULT_SETTINGS) {
      this.set(key, DEFAULT_SETTINGS[key]);
    }
  }

  export() {
    return JSON.stringify(this.#settings, null, 2);
  }

  import(json) {
    try {
      const imported = JSON.parse(json);

      if (typeof imported !== "object" || imported === null) {
        throw new Error("Invalid settings format");
      }

      this.#settings = { ...DEFAULT_SETTINGS, ...imported };
      this.#persistSettings();
      return true;
    } catch (error) {
      console.error("Failed to import settings:", error);
      return false;
    }
  }
}

export function saveGame(gameState) {
  try {
    const saveData = {
      version: SCHEMA_VERSION,
      timestamp: new Date().toISOString(),
      state: gameState,
    };

    const serialized = JSON.stringify(saveData);
    localStorage.setItem(`${STORAGE_PREFIX}savegame`, serialized);

    const existingBackup = localStorage.getItem(
      `${STORAGE_PREFIX}savegame_backup`
    );
    if (existingBackup) {
      localStorage.setItem(
        `${STORAGE_PREFIX}savegame_backup_old`,
        existingBackup
      );
    }
    localStorage.setItem(`${STORAGE_PREFIX}savegame_backup`, serialized);

    return true;
  } catch (error) {
    console.error("Failed to save game:", error);
    return false;
  }
}

export function loadGame() {
  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}savegame`);
    if (!saved) return null;

    const saveData = JSON.parse(saved);

    if (saveData.version !== SCHEMA_VERSION) {
      console.warn(
        `Save game version mismatch: ${saveData.version} vs ${SCHEMA_VERSION}`
      );
      return loadBackupGame();
    }

    return saveData.state;
  } catch (error) {
    console.error("Failed to load game:", error);
    return loadBackupGame();
  }
}

function loadBackupGame() {
  try {
    const backup = localStorage.getItem(`${STORAGE_PREFIX}savegame_backup`);
    if (!backup) return null;

    const saveData = JSON.parse(backup);
    return saveData.state;
  } catch (error) {
    console.error("Failed to load backup game:", error);
    return null;
  }
}

export function hasSavedGame() {
  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}savegame`);
    return saved !== null;
  } catch (error) {
    return false;
  }
}

export function deleteSavedGame() {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}savegame`);
    return true;
  } catch (error) {
    console.error("Failed to delete saved game:", error);
    return false;
  }
}

export const settingsManager = new SettingsManager();
export default settingsManager;
