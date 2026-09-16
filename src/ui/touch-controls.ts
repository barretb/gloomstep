import { Action, UIMode } from '../types';

/** Parses a button's data-action attribute into a game action. */
export function parseControlAction(value: string): Action | null {
  if (value.startsWith('move:')) {
    const parts = value.slice('move:'.length).split(',');
    if (parts.length !== 2) return null;
    const dx = Number(parts[0]);
    const dy = Number(parts[1]);
    if (!isStep(dx) || !isStep(dy)) return null;
    return { type: 'move', dx, dy };
  }
  switch (value) {
    case 'wait':
    case 'pickup':
    case 'toggleInventory':
    case 'toggleLog':
    case 'ability':
    case 'descend':
      return { type: value };
    default:
      return null;
  }
}

function isStep(n: number): boolean {
  return Number.isInteger(n) && n >= -1 && n <= 1;
}

/** The on-screen controls only make sense while a run is in progress. */
export function controlBarVisible(mode: UIMode): boolean {
  return mode === 'game' || mode === 'inventory' || mode === 'log';
}

/** Routes taps on the control bar's buttons to the game. */
export function setupTouchControls(bar: HTMLElement, dispatch: (action: Action) => void): void {
  bar.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest('button');
    if (!button) return;
    e.preventDefault();
    const action = parseControlAction(button.dataset.action ?? '');
    if (action) dispatch(action);
  });
}
