import { CANVAS_W, CANVAS_H } from './constants';
import { Game } from './game';
import { setupInput } from './systems/input';
import { getHudHeight } from './render/hud';
import { loadSprites } from './render/sprite-loader';
import { canvasPointFromClient } from './ui/hit-regions';
import { controlBarVisible, setupTouchControls } from './ui/touch-controls';

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = CANVAS_W;
canvas.height = CANVAS_H + getHudHeight();

const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;

// Load sprites then start game
loadSprites().then((sprites) => {
  const game = new Game(ctx, sprites);
  const bar = document.getElementById('touch-controls') as HTMLElement;

  // The on-screen control bar only shows while a run is in progress.
  const syncBar = () => {
    bar.hidden = !controlBarVisible(game.state.uiMode);
  };

  setupInput(
    (action) => {
      game.tick(action);
      syncBar();
    },
    () => game.state.uiMode
  );

  setupTouchControls(bar, (action) => {
    game.tick(action);
    syncBar();
  });

  // Taps on the canvas go to whatever screen is drawn there
  canvas.addEventListener('click', (e) => {
    const { x, y } = canvasPointFromClient(
      canvas.getBoundingClientRect(),
      canvas.width,
      canvas.height,
      e.clientX,
      e.clientY
    );
    game.handleTap(x, y);
    syncBar();
  });

  // Handle charselect, gameover, and other special keys
  window.addEventListener('keydown', (e) => {
    if (game.state.uiMode === 'charselect') {
      e.preventDefault();
      game.handleCharSelectInput(e.key);
      syncBar();
      return;
    }
    if (game.state.uiMode === 'gameover') {
      e.preventDefault();
      game.handleGameOverInput(e.key);
      syncBar();
    }
  });

  syncBar();
});
