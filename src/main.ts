import { Game } from './game';
import { setupInput } from './systems/input';
import { loadSprites } from './render/sprite-loader';
import { computeLayout, getLayout, setLayout } from './render/layout';
import { canvasPointFromClient } from './ui/hit-regions';
import { controlBarVisible, setupTouchControls } from './ui/touch-controls';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const container = document.getElementById('game-container') as HTMLElement;

const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;

// Pick the layout for this screen before anything draws
setLayout(computeLayout(container.clientWidth));

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

  // Run codes: typed via the browser prompt, or carried on the link that opened the page
  game.onRequestRunCode = () => {
    const code = window.prompt('Enter a run code (for example 1z8k3f-7):');
    if (code !== null) {
      game.armSharedRun(code);
      syncBar();
    }
  };
  const pageUrl = new URL(window.location.href);
  const runParam = pageUrl.searchParams.get('run');
  if (runParam) {
    game.armSharedRun(runParam);
    // Drop the parameter so a refresh does not re-arm the shared run
    pageUrl.searchParams.delete('run');
    window.history.replaceState(null, '', pageUrl.toString());
  }

  // Switch layouts when the window crosses the compact breakpoint (rotation, resize)
  window.addEventListener('resize', () => {
    const next = computeLayout(container.clientWidth);
    if (next.compact !== getLayout().compact) {
      setLayout(next);
      game.redraw();
    }
  });
});
