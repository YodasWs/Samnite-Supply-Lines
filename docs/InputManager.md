# InputManager - Centralized Input System

## Overview

The InputManager provides a centralized, event-driven input handling system for the Empires 4X game. It manages keyboard shortcuts, pointer interactions, and fires events for game logic to respond to.

## Architecture

### Centralized Keyboard Shortcuts

All keyboard shortcuts are defined in the `KEYBOARD_SHORTCUTS` constant at the top of the file:

```javascript
const KEYBOARD_SHORTCUTS = {
  global: {
    /* shortcuts available in all scenes */
  },
  mainGame: {
    /* shortcuts specific to main game */
  },
  cityView: {
    /* shortcuts specific to city view */
  },
  tileView: {
    /* shortcuts specific to tile view */
  },
  settings: {
    /* shortcuts specific to settings */
  },
};
```

### Event-Driven Architecture

All input actions fire events through `currentGame.events`:

**Input Events Fired:**

- `input:unit-move` - Unit movement requested
- `input:unit-wait` - Wait command
- `input:unit-skip` - Skip unit command
- `input:build-farm` - Build farm action
- `input:clear-claims` - Clear territorial claims
- `input:show-claims` - Show territorial claims
- `input:open-settings` - Settings opened
- `input:close-menu` - Menu closed
- `input:hex-click` - Hex tile clicked
- `input:drag-start` - Drag operation started
- `input:drag-move` - Drag in progress
- `input:drag-end` - Drag operation ended
- `input:close-city-view` - City view closed
- `input:close-tile-view` - Tile view closed
- `input:close-settings` - Settings closed

**Legacy Events (maintained for compatibility):**

- `key-pressed` - Generic key press with action name
- `hex-clicked` - Hex clicked (includes hex object)
- `esc-pressed` - Escape key pressed

## Per-Scene Configuration

### Main Game Scene (`mainGameScene`)

**Keyboard:**

- `W` - Wait with current unit
- `S` - Skip current unit
- `Shift+F` - Build farm (farmer only)
- `F2` - Clear territorial claims
- `F3` - Show territorial claims
- `U/I/O/J/K/L` - Unit movement (hex directions)
- `Escape` - Close menus or open settings
- `F1` - Open settings
- `Arrow Keys` - Camera pan (hold Shift for faster)

**Pointer:**

- Click - Select hex
- Drag - Pan camera
- Right-click - Prevented (no context menu)

**Drag Threshold:**

- Mouse: User setting (default 4px)
- Touch: 2.5× user setting
- Pen: 2.0× user setting

### City View Scene (`city-view`)

**Keyboard:**

- `Escape` - Close city view

### Tile View Scene (`tile-view`)

**Keyboard:**

- `Escape` - Close tile view

### Settings Scene (`settings`)

**Keyboard:**

- `Escape` - Close settings (handled by Settings scene itself)

## Usage

### Creating an InputManager Instance

```javascript
// In your Phaser Scene's create() method:
import InputManager from './modules/InputManager.mjs';

create() {
  this.inputManager = new InputManager(this);
}
```

### Updating Input (for camera controls)

```javascript
update() {
  this.inputManager?.update();
}
```

### Listening to Input Events

```javascript
// In any game module:
import { currentGame } from "./Game.mjs";

currentGame.events.on("input:hex-click", (evt) => {
  const { hex, pointer } = evt.detail;
  console.log("Hex clicked:", hex);
});

currentGame.events.on("input:unit-move", (evt) => {
  const { direction, unit } = evt.detail;
  console.log(`Unit moving ${direction}`);
});
```

### Cleaning Up

```javascript
// In your Scene's shutdown or destroy:
shutdown() {
  this.inputManager?.destroy();
}
```

### Getting Keyboard Shortcuts Programmatically

```javascript
// Get shortcuts for a specific scene:
const mainGameShortcuts = InputManager.getShortcuts("mainGame");

// Get all shortcuts:
const allShortcuts = InputManager.getAllShortcuts();
```

## Adding New Shortcuts

To add a new keyboard shortcut:

1. Add to `KEYBOARD_SHORTCUTS` constant:

```javascript
const KEYBOARD_SHORTCUTS = {
  mainGame: {
    n: { action: "next-unit", description: "Select next unit" },
  },
};
```

2. Handle in `#handleActionKey()`:

```javascript
#handleActionKey(action) {
  switch (action) {
    case 'next-unit':
      currentGame.events.emit('input:next-unit');
      // Implement logic or let other modules handle the event
      break;
  }
}
```

3. Listen for the event elsewhere:

```javascript
currentGame.events.on("input:next-unit", () => {
  // Your logic here
});
```

## Configuration Options

### Drag Threshold

Configured via SettingsManager:

```javascript
settingsManager.set("dragThreshold", 8); // pixels
```

### Camera Pan Speed

Hardcoded in `update()` method:

- Normal: 5 pixels/frame
- With Shift: 25 pixels/frame

## Best Practices

1. **Event Naming**: Use `input:` prefix for all input-related events
2. **Scene-Specific Shortcuts**: Add shortcuts to the appropriate scene section
3. **Global Shortcuts**: Only use for actions needed across all scenes
4. **Event Payload**: Always include relevant context in event detail
5. **Clean Up**: Always call `destroy()` when scene stops

## Migration from Old System

Old direct key handling:

```javascript
// OLD:
this.input.keyboard.on("keydown", (evt) => {
  if (evt.key === "w") {
    currentGame.events.emit("key-pressed", "wait");
  }
});
```

New centralized system:

```javascript
// NEW: Add to KEYBOARD_SHORTCUTS, handled automatically
// Listen for event:
currentGame.events.on("input:unit-wait", () => {
  // Handle wait action
});
```

## Future Enhancements

- Customizable keybindings (save to SettingsManager)
- Gamepad support
- Touch gesture recognition (pinch-to-zoom, swipe)
- Keyboard shortcut hints UI
- Shortcut conflict detection
- Recording and playback for testing
