import { CANVAS_W, CANVAS_H } from './constants';
import { Game } from './game';
import { setupInput } from './systems/input';
import { getHudHeight } from './render/hud';
import { loadSprites } from './render/sprite-loader';

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = CANVAS_W;
canvas.height = CANVAS_H + getHudHeight();

const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;

// Load sprites then start game
loadSprites().then((sprites) => {
  const game = new Game(ctx, sprites);

  setupInput(
    (action) => game.tick(action),
    () => game.state.uiMode
  );

  // Handle charselect, gameover, and other special keys
  window.addEventListener('keydown', (e) => {
    if (game.state.uiMode === 'charselect') {
      e.preventDefault();
      game.handleCharSelectInput(e.key);
      return;
    }
    if (game.state.uiMode === 'gameover') {
      e.preventDefault();
      game.handleGameOverInput(e.key);
    }
  });
});
