import { Action, UIMode } from '../types';

export function setupInput(onAction: (action: Action) => void, getUIMode: () => UIMode): void {
  window.addEventListener('keydown', (e) => {
    const action = keyToAction(e.key, getUIMode());
    if (action) {
      e.preventDefault();
      onAction(action);
    }
  });
}

function keyToAction(key: string, mode: UIMode): Action | null {
  if (mode === 'gameover') {
    return null; // handled separately
  }

  if (mode === 'inventory') {
    if (key === 'i' || key === 'Escape') {
      return { type: 'toggleInventory' };
    }
    const num = parseInt(key);
    if (num >= 1 && num <= 9) {
      return { type: 'useItem', index: num - 1 };
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
    case '>':
      return { type: 'descend' };
    default:
      return null;
  }
}
