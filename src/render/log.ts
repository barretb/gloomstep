import { COLORS } from '../constants';
import { GameState } from '../types';
import { HitRegion } from '../ui/hit-regions';
import { canvasHeightFor, getLayout, Layout } from './layout';

/** Messages kept in the run's history. */
export const LOG_CAPACITY = 200;
/** Lines scrolled by Page Up / Page Down and the on-screen arrows. */
export const LOG_PAGE = 10;

const LINE_H = 16;
const FONT_PX = 13;
/** Approximate advance of a 13px monospace glyph, used to truncate long lines. */
const CHAR_W = 7.8;

interface Panel {
  x: number;
  y: number;
  w: number;
  h: number;
  areaH: number;
  canvasH: number;
}

function panelFor(layout: Layout): Panel {
  const canvasH = canvasHeightFor('log', layout);
  // Desktop overlays the map only (HUD stays visible); compact uses the whole menu canvas.
  const areaH = layout.compact ? canvasH : layout.mapH;
  const x = layout.compact ? 20 : 60;
  const y = layout.compact ? 20 : 40;
  return { x, y, w: layout.mapW - 2 * x, h: areaH - 2 * y, areaH, canvasH };
}

/** How many log lines fit in the panel under a layout. */
export function logVisibleLines(layout: Layout): number {
  const panel = panelFor(layout);
  // Title block above (60px) and footer below (40px)
  return Math.max(1, Math.floor((panel.h - 100) / LINE_H));
}

/**
 * Draws the scrollable message history. `scroll` counts lines back from the
 * newest message; 0 shows the most recent lines.
 */
export function drawMessageLog(ctx: CanvasRenderingContext2D, state: GameState, scroll: number): HitRegion[] {
  const regions: HitRegion[] = [];
  const L = getLayout();
  const panel = panelFor(L);

  // Lowest priority: tapping outside the panel closes the log
  regions.push({ x: 0, y: 0, w: L.mapW, h: panel.canvasH, action: { type: 'closeLog' } });

  // Overlay and border
  ctx.fillStyle = COLORS.inventoryBg;
  ctx.fillRect(0, 0, L.mapW, panel.areaH);
  ctx.strokeStyle = COLORS.inventoryBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);

  // Close mark
  const closeBox = { x: panel.x + panel.w - 36, y: panel.y + 8, w: 28, h: 28 };
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✕', closeBox.x + closeBox.w / 2, closeBox.y + closeBox.h / 2);
  regions.push({ ...closeBox, action: { type: 'closeLog' } });

  // Title
  ctx.fillStyle = COLORS.textBright;
  ctx.font = 'bold 18px monospace';
  ctx.fillText('MESSAGE LOG', L.mapW / 2, panel.y + 30);

  // Lines, oldest at the top
  const visible = logVisibleLines(L);
  const total = state.messages.length;
  const end = Math.max(0, total - scroll);
  const start = Math.max(0, end - visible);
  const textX = panel.x + 20;
  const maxChars = Math.max(10, Math.floor((panel.w - 90) / CHAR_W));
  const firstLineY = panel.y + 60;

  ctx.textAlign = 'left';
  ctx.font = `${FONT_PX}px monospace`;
  if (total === 0) {
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('(no messages yet)', textX, firstLineY);
  } else {
    for (let i = start; i < end; i++) {
      const msg = state.messages[i];
      const text = msg.length > maxChars ? `${msg.slice(0, maxChars - 1)}…` : msg;
      // Newest lines are brightest
      const age = end - 1 - i;
      const alpha = Math.max(0.45, 1 - age * 0.04);
      ctx.fillStyle = `rgba(200, 200, 200, ${alpha})`;
      ctx.fillText(text, textX, firstLineY + (i - start) * LINE_H);
    }
  }

  // Scroll arrows (tap targets): up = older, down = newer
  const arrowX = panel.x + panel.w - 44;
  const upBox = { x: arrowX, y: panel.y + 60, w: 32, h: 32 };
  const downBox = { x: arrowX, y: panel.y + panel.h - 76, w: 32, h: 32 };
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = start > 0 ? COLORS.text : COLORS.textDim;
  ctx.fillText('▲', upBox.x + upBox.w / 2, upBox.y + upBox.h / 2);
  regions.push({ ...upBox, action: { type: 'scrollLog', by: LOG_PAGE } });
  ctx.fillStyle = scroll > 0 ? COLORS.text : COLORS.textDim;
  ctx.fillText('▼', downBox.x + downBox.w / 2, downBox.y + downBox.h / 2);
  regions.push({ ...downBox, action: { type: 'scrollLog', by: -LOG_PAGE } });

  // Footer
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  const range = total === 0 ? '0 of 0' : `${start + 1}–${end} of ${total}`;
  const hint = L.compact ? 'Showing ' + range : `Showing ${range}  |  [↑↓] scroll  [PgUp/PgDn] page  [L/Esc] close`;
  ctx.fillText(hint, L.mapW / 2, panel.y + panel.h - 30);

  return regions;
}
