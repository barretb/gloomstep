import { Action, UIMode } from '../types';
import { LOG_PAGE } from '../render/log';

export function setupInput(onAction: (action: Action) => void, getUIMode: () => UIMode): void {
  window.addEventListener('keydown', (e) => {
    const action = keyToAction(e.key, getUIMode());
    if (action) {
      e.preventDefault();
      onAction(action);
    }
  });
}

export function keyToAction(key: string, mode: UIMode): Action | null {
  if (mode === 'gameover' || mode === 'charselect') {
    return null; // handled separately
  }

  if (mode === 'log') {
    switch (key) {
      case 'l':
      case 'L':
      case 'Escape':
        return { type: 'toggleLog' };
      case 'ArrowUp':
      case 'w':
      case 'W':
        return { type: 'scrollLog', by: 1 };
      case 'ArrowDown':
      case 's':
      case 'S':
        return { type: 'scrollLog', by: -1 };
      case 'PageUp':
        return { type: 'scrollLog', by: LOG_PAGE };
      case 'PageDown':
        return { type: 'scrollLog', by: -LOG_PAGE };
      case 'Home':
        return { type: 'scrollLog', by: Infinity };
      case 'End':
        return { type: 'scrollLog', by: -Infinity };
      default:
        return null;
    }
  }

  if (mode === 'inventory') {
    if (key === 'i' || key === 'Escape') {
      return { type: 'toggleInventory' };
    }
    // 1-9 map to slots 1-9; 0 maps to slot 10
    const useKeys = '1234567890';
    const useIndex = useKeys.indexOf(key);
    if (key.length === 1 && useIndex >= 0) {
      return { type: 'useItem', index: useIndex };
    }
    // Shift+1-9 and Shift+0 drop the matching slot
    const dropKeys = '!@#$%^&*()';
    const dropIndex = dropKeys.indexOf(key);
    if (dropIndex >= 0) {
      return { type: 'dropItem', index: dropIndex };
    }
    return null;
  }

  // Game mode
  switch (key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      return { type: 'move', dx: 0, dy: -1 };
    case 'ArrowDown':
    case 's':
    case 'S':
      return { type: 'move', dx: 0, dy: 1 };
    case 'ArrowLeft':
    case 'a':
    case 'A':
      return { type: 'move', dx: -1, dy: 0 };
    case 'ArrowRight':
    case 'd':
    case 'D':
      return { type: 'move', dx: 1, dy: 0 };
    case '.':
    case '5':
      return { type: 'wait' };
    case 'g':
    case 'G':
      return { type: 'pickup' };
    case 'i':
    case 'I':
      return { type: 'toggleInventory' };
    case 'l':
    case 'L':
      return { type: 'toggleLog' };
    case 'q':
    case 'Q':
      return { type: 'ability' };
    case '>':
      return { type: 'descend' };
    default:
      return null;
  }
}
