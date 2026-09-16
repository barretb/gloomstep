import { COLORS, TILE_SIZE, BOSS_DEPTH } from '../constants';
import { GameState } from '../types';
import { CHARACTERS } from '../data/characters';
import { SpriteMap } from './sprite-loader';
import { EQUIP_SLOTS, getAttackBonus, getDefenseBonus } from '../systems/equipment';
import { ABILITIES } from '../data/abilities';
import { SaveSummary } from '../systems/persistence';
import { DailyResult } from '../systems/daily';
import { formatRunCode } from '../systems/runcode';
import { HitRegion } from '../ui/hit-regions';
import { canvasHeightFor, getLayout } from './layout';

const PADDING = 10;

export function getHudHeight(): number {
  return getLayout().hudH;
}

export function drawHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  const L = getLayout();
  const hudY = L.mapH;

  // HUD background
  ctx.fillStyle = '#111122';
  ctx.fillRect(0, hudY, L.mapW, L.hudH);
  ctx.strokeStyle = COLORS.inventoryBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(0, hudY, L.mapW, L.hudH);

  const stats = state.player.stats!;
  const atkBonus = getAttackBonus(state.player);
  const defBonus = getDefenseBonus(state.player);

  // HP bar
  const barX = PADDING;
  const barY = hudY + PADDING;
  const barW = L.compact ? 150 : 200;
  const barH = 16;
  const hpRatio = stats.hp / stats.maxHp;

  ctx.fillStyle = COLORS.hpBarBg;
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = COLORS.hpBar;
  ctx.fillRect(barX, barY, barW * hpRatio, barH);
  ctx.strokeStyle = '#666';
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.fillStyle = COLORS.textBright;
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`HP: ${stats.hp}/${stats.maxHp}`, barX + 4, barY + barH / 2);

  // XP bar
  const xpBarY = barY + barH + 4;
  const xpRatio = stats.xpToNext > 0 ? stats.xp / stats.xpToNext : 0;

  ctx.fillStyle = '#112211';
  ctx.fillRect(barX, xpBarY, barW, barH);
  ctx.fillStyle = COLORS.xpBar;
  ctx.fillRect(barX, xpBarY, barW * xpRatio, barH);
  ctx.strokeStyle = '#666';
  ctx.strokeRect(barX, xpBarY, barW, barH);

  ctx.fillStyle = COLORS.textBright;
  ctx.fillText(`XP: ${stats.xp}/${stats.xpToNext}`, barX + 4, xpBarY + barH / 2);

  // Stats text: two rows of three columns to the right of the bars
  const statsX = barX + barW + 20;
  const col = L.compact ? 95 : 100;
  ctx.fillStyle = COLORS.text;
  if (state.depth >= BOSS_DEPTH) {
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`Depth: ${state.depth} (final)`, statsX, barY + 8);
    ctx.fillStyle = COLORS.text;
  } else {
    ctx.fillText(`Depth: ${state.depth}`, statsX, barY + 8);
  }
  ctx.fillText(`Level: ${stats.level}`, statsX, barY + 24);
  ctx.fillText(`ATK: ${stats.attack}${atkBonus ? '+' + atkBonus : ''}`, statsX + col, barY + 8);
  ctx.fillText(`DEF: ${stats.defense}${defBonus ? '+' + defBonus : ''}`, statsX + col, barY + 24);
  ctx.fillText(`Score: ${state.score}`, statsX + 2 * col, barY + 8);
  ctx.fillText(`Turn: ${state.turn}`, statsX + 2 * col, barY + 24);

  // Gold and ability: a fourth column on desktop, a third row under the bars on compact
  const goldPos = L.compact ? { x: barX, y: barY + 40 } : { x: statsX + 300, y: barY + 8 };
  const abilityPos = L.compact ? { x: barX + 120, y: barY + 40 } : { x: statsX + 300, y: barY + 24 };
  ctx.fillStyle = '#ffd700';
  ctx.fillText(`Gold: ${state.treasureCollected}`, goldPos.x, goldPos.y);

  const ability = state.player.ability;
  if (ability) {
    const def = ABILITIES[ability.id];
    const ready = ability.cooldownRemaining === 0;
    const effects = (state.player.statusEffects ?? []).map((e) =>
      e.kind === 'stealth'
        ? `HIDDEN ${e.turnsRemaining}`
        : `${e.stat === 'attack' ? 'RAGE' : 'GUARD'} ${e.turnsRemaining}`
    );
    const status = ready ? 'READY' : `${ability.cooldownRemaining} turns`;
    ctx.fillStyle = ready ? COLORS.textBright : COLORS.textDim;
    ctx.fillText(`[Q] ${def.name}: ${status}`, abilityPos.x, abilityPos.y);
    if (effects.length > 0) {
      ctx.fillStyle = '#ff88ff';
      const prefixW = ctx.measureText(`[Q] ${def.name}: ${status}  `).width;
      ctx.fillText(effects.join('  '), abilityPos.x + prefixW, abilityPos.y);
    }
  }

  // Message log
  const msgX = PADDING;
  const msgY = L.compact ? barY + 56 : xpBarY + barH + 8;
  const lineH = L.compact ? 12 : 14;
  const recentMessages = state.messages.slice(-L.maxMessages);
  ctx.font = '11px monospace';
  recentMessages.forEach((msg, i) => {
    const alpha = 0.5 + 0.5 * ((i + 1) / recentMessages.length);
    ctx.fillStyle = `rgba(200, 200, 200, ${alpha})`;
    ctx.fillText(msg, msgX, msgY + i * lineH);
  });
}

export function drawInventoryScreen(ctx: CanvasRenderingContext2D, state: GameState): HitRegion[] {
  const regions: HitRegion[] = [];
  const inv = state.player.inventory;
  if (!inv) return regions;

  const L = getLayout();
  const H = canvasHeightFor('inventory', L);
  // On desktop the inventory sits over the map and leaves the HUD visible; compact uses the whole menu canvas.
  const areaH = L.compact ? H : L.mapH;

  // Lowest priority: tapping anywhere outside the panel closes the inventory
  regions.push({ x: 0, y: 0, w: L.mapW, h: H, action: { type: 'closeInventory' } });

  // Overlay
  ctx.fillStyle = COLORS.inventoryBg;
  ctx.fillRect(0, 0, L.mapW, areaH);

  // Border
  const panelX = L.compact ? 20 : 60;
  const panelY = L.compact ? 20 : 40;
  const panelW = L.mapW - 2 * panelX;
  const panelH = areaH - 2 * panelY;
  ctx.strokeStyle = COLORS.inventoryBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  // Close mark (tap target)
  const closeBox = { x: panelX + panelW - 36, y: panelY + 8, w: 28, h: 28 };
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✕', closeBox.x + closeBox.w / 2, closeBox.y + closeBox.h / 2);
  regions.push({ ...closeBox, action: { type: 'closeInventory' } });

  // Title
  ctx.fillStyle = COLORS.textBright;
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('INVENTORY', L.mapW / 2, panelY + 30);

  ctx.textAlign = 'left';
  ctx.font = '14px monospace';

  const equip = state.player.equipment;

  // Equipment section: two columns on desktop, one on compact
  let y = panelY + 60;
  ctx.fillStyle = COLORS.stairs;
  ctx.fillText('Equipment:', panelX + 20, y);
  y += 22;
  const slotCols = L.compact ? 1 : 2;
  const slotRows = Math.ceil(EQUIP_SLOTS.length / slotCols);
  const slotColW = Math.floor((panelW - 60) / slotCols);
  EQUIP_SLOTS.forEach((info, i) => {
    const col = Math.floor(i / slotRows);
    const row = i % slotRows;
    const x = panelX + 30 + col * slotColW;
    const lineY = y + row * 18;
    const label = `${info.label}: `;
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(label, x, lineY);
    const labelW = ctx.measureText(label).width;

    const item = equip?.[info.slot] ?? null;
    if (!item) {
      ctx.fillText('(none)', x + labelW, lineY);
      return;
    }
    const name = item.appearance?.name ?? 'item';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(name, x + labelW, lineY);
    const atk = item.item?.attackBonus ?? 0;
    const def = item.item?.defenseBonus ?? 0;
    if (atk || def) {
      ctx.fillStyle = atk ? '#88ff88' : '#88aaff';
      ctx.fillText(atk ? ` +${atk} ATK` : ` +${def} DEF`, x + labelW + ctx.measureText(name).width, lineY);
    }
  });
  y += slotRows * 18 + 8;

  // Stats summary
  const stats = state.player.stats!;
  const atkBonus = getAttackBonus(state.player);
  const defBonus = getDefenseBonus(state.player);

  ctx.fillStyle = COLORS.stairs;
  ctx.fillText('Your Stats:', panelX + 20, y);
  y += 22;
  ctx.font = '13px monospace';

  // ATK line
  ctx.fillStyle = COLORS.text;
  if (atkBonus > 0) {
    ctx.fillText(`ATK: ${stats.attack}`, panelX + 30, y);
    ctx.fillStyle = '#88ff88';
    ctx.fillText(` + ${atkBonus}`, panelX + 30 + ctx.measureText(`ATK: ${stats.attack}`).width, y);
    ctx.fillStyle = COLORS.textBright;
    ctx.fillText(` = ${stats.attack + atkBonus}`, panelX + 30 + ctx.measureText(`ATK: ${stats.attack} + ${atkBonus}`).width, y);
  } else {
    ctx.fillText(`ATK: ${stats.attack}`, panelX + 30, y);
  }
  y += 18;

  // DEF line
  ctx.fillStyle = COLORS.text;
  if (defBonus > 0) {
    ctx.fillText(`DEF: ${stats.defense}`, panelX + 30, y);
    ctx.fillStyle = '#88aaff';
    ctx.fillText(` + ${defBonus}`, panelX + 30 + ctx.measureText(`DEF: ${stats.defense}`).width, y);
    ctx.fillStyle = COLORS.textBright;
    ctx.fillText(` = ${stats.defense + defBonus}`, panelX + 30 + ctx.measureText(`DEF: ${stats.defense} + ${defBonus}`).width, y);
  } else {
    ctx.fillText(`DEF: ${stats.defense}`, panelX + 30, y);
  }
  y += 18;

  // HP line
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`HP:  ${stats.hp}/${stats.maxHp}`, panelX + 30, y);
  y += 26;

  ctx.font = '14px monospace';

  // Items
  ctx.fillStyle = COLORS.stairs;
  ctx.fillText('Items:', panelX + 20, y);
  y += 22;

  if (inv.items.length === 0) {
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('(empty)', panelX + 30, y);
  } else {
    inv.items.forEach((item, i) => {
      const app = item.appearance!;
      ctx.textAlign = 'left';
      ctx.fillStyle = app.color;
      ctx.fillText(`${i + 1}. `, panelX + 30, y);
      ctx.fillStyle = COLORS.text;
      const suffix = item.item?.kind === 'weapon'
        ? ` (+${item.item.attackBonus} ATK)`
        : item.item?.kind === 'armor'
        ? ` (+${item.item.defenseBonus} DEF)`
        : item.item?.useEffect?.type === 'heal'
        ? ` (heals ${item.item.useEffect.amount})`
        : item.item?.useEffect?.type === 'damage'
        ? ` (${item.item.useEffect.amount} dmg)`
        : '';
      ctx.fillText(`${app.name}${suffix}`, panelX + 60, y);
      regions.push({ x: panelX + 20, y: y - 9, w: panelW - 120, h: 18, action: { type: 'useItem', index: i } });

      ctx.textAlign = 'right';
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText('[drop]', panelX + panelW - 20, y);
      regions.push({ x: panelX + panelW - 90, y: y - 9, w: 70, h: 18, action: { type: 'dropItem', index: i } });
      y += 18;
    });
  }

  // Help text
  y = panelY + panelH - 30;
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('[1-9, 0] or tap: Use  |  [Shift+num] or [drop]: Drop  |  [Esc/i] or ✕: Close', L.mapW / 2, y);

  return regions;
}

export interface DailyPanelInfo {
  on: boolean;
  date: string;
  heroIndex: number;
  result: DailyResult | null;
}

export function drawCharSelect(
  ctx: CanvasRenderingContext2D,
  selectedIndex: number,
  sprites: SpriteMap,
  resume: SaveSummary | null = null,
  confirmAbandon = false,
  daily: DailyPanelInfo | null = null,
  shared: { code: string; heroIndex: number } | null = null,
  sharedError = false
): HitRegion[] {
  const regions: HitRegion[] = [];
  const L = getLayout();
  const totalH = canvasHeightFor('charselect', L);

  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, L.mapW, totalH);

  // Title
  ctx.fillStyle = '#ffcc00';
  ctx.font = L.compact ? 'bold 22px monospace' : 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('CHOOSE YOUR HERO', L.mapW / 2, L.compact ? 32 : 40);

  // Grid layout: 5 columns of 140x120 on desktop, 4 columns of 116x96 on compact
  const cols = L.compact ? 4 : 5;
  const cellW = L.compact ? 116 : 140;
  const cellH = L.compact ? 96 : 120;
  const gridW = cols * cellW;
  const startX = Math.floor((L.mapW - gridW) / 2);
  const startY = L.compact ? 55 : 65;

  CHARACTERS.forEach((char, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * cellW;
    const y = startY + row * cellH;

    const isSelected = i === selectedIndex;
    regions.push({ x, y, w: cellW, h: cellH, action: { type: 'selectHero', index: i } });

    // Cell background
    if (isSelected) {
      ctx.fillStyle = 'rgba(255, 204, 0, 0.15)';
      ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4);
    } else {
      ctx.fillStyle = 'rgba(40, 40, 60, 0.5)';
      ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
      ctx.strokeStyle = COLORS.inventoryBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4);
    }

    // Character sprite (2x on desktop, 1.5x on compact)
    const spriteSize = L.compact ? Math.floor(TILE_SIZE * 1.5) : TILE_SIZE * 2;
    const spriteX = x + Math.floor((cellW - spriteSize) / 2);
    const spriteY = y + (L.compact ? 6 : 8);
    const img = sprites.get(char.sprite);
    if (img) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, spriteX, spriteY, spriteSize, spriteSize);
    } else {
      // Fallback: draw placeholder box
      ctx.fillStyle = '#444';
      ctx.fillRect(spriteX, spriteY, spriteSize, spriteSize);
      ctx.fillStyle = '#ffcc00';
      ctx.font = `bold ${spriteSize - 8}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', spriteX + spriteSize / 2, spriteY + spriteSize / 2);
    }

    // Character name
    ctx.fillStyle = isSelected ? '#ffcc00' : COLORS.text;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(char.race, x + cellW / 2, spriteY + spriteSize + 4);
    ctx.fillText(char.className, x + cellW / 2, spriteY + spriteSize + 16);
  });

  // Selected character details panel
  const selected = CHARACTERS[selectedIndex];
  const detailY = startY + Math.ceil(CHARACTERS.length / cols) * cellH + 10;
  const cx = L.mapW / 2;

  ctx.fillStyle = 'rgba(40, 40, 60, 0.7)';
  ctx.fillRect(startX, detailY, gridW, 100);
  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth = 1;
  ctx.strokeRect(startX, detailY, gridW, 100);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(selected.name, cx, detailY + 20);

  ctx.fillStyle = COLORS.text;
  ctx.font = '13px monospace';
  const statsText = `HP: ${selected.stats.hp}  ATK: ${selected.stats.attack}  DEF: ${selected.stats.defense}`;
  ctx.fillText(statsText, cx, detailY + 40);

  const ability = ABILITIES[selected.ability];
  ctx.fillStyle = '#ff88ff';
  ctx.font = L.compact ? '11px monospace' : '12px monospace';
  ctx.fillText(`[Q] ${ability.name}: ${ability.description} (${ability.cooldown} turn cooldown)`, cx, detailY + 60);

  // Keyboard hint (desktop only; it does not fit beside START on compact)
  if (!L.compact) {
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '12px monospace';
    ctx.fillText('[Arrows] Select', cx, detailY + 84);
  }

  // START button (tap target)
  const startBtn = { x: startX + gridW - (L.compact ? 118 : 130), y: detailY + (L.compact ? 68 : 66), w: 110, h: 26 };
  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth = 1;
  ctx.strokeRect(startBtn.x, startBtn.y, startBtn.w, startBtn.h);
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('START', startBtn.x + startBtn.w / 2, startBtn.y + startBtn.h / 2);
  regions.push({ ...startBtn, action: { type: 'startHero' } });

  // Daily toggle (tap target)
  if (daily) {
    const dailyBtn = L.compact
      ? { x: startX + 8, y: detailY + 68, w: 130, h: 26 }
      : { x: startX + 8, y: detailY + 66, w: 150, h: 26 };
    ctx.strokeStyle = daily.on ? COLORS.stairs : COLORS.textDim;
    ctx.lineWidth = 1;
    ctx.strokeRect(dailyBtn.x, dailyBtn.y, dailyBtn.w, dailyBtn.h);
    ctx.fillStyle = daily.on ? COLORS.stairs : COLORS.textDim;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`[D] Daily: ${daily.on ? 'ON' : 'OFF'}`, dailyBtn.x + dailyBtn.w / 2, dailyBtn.y + dailyBtn.h / 2);
    regions.push({ ...dailyBtn, action: { type: 'toggleDaily' } });
  }

  // Run code entry (tap target), left of START
  const codeBtn = L.compact
    ? { x: startX + gridW - 256, y: detailY + 68, w: 130, h: 26 }
    : { x: startX + gridW - 278, y: detailY + 66, w: 140, h: 26 };
  ctx.strokeStyle = shared ? COLORS.stairs : COLORS.textDim;
  ctx.lineWidth = 1;
  ctx.strokeRect(codeBtn.x, codeBtn.y, codeBtn.w, codeBtn.h);
  ctx.fillStyle = shared ? COLORS.stairs : COLORS.textDim;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('[E] Run code', codeBtn.x + codeBtn.w / 2, codeBtn.y + codeBtn.h / 2);
  regions.push({ ...codeBtn, action: { type: 'enterRunCode' } });

  // Continue banner for a saved run
  if (resume) {
    ctx.font = L.compact ? 'bold 12px monospace' : 'bold 14px monospace';
    ctx.textAlign = 'center';
    if (confirmAbandon) {
      ctx.fillStyle = '#ff5555';
      ctx.fillText(
        L.compact
          ? 'Erase saved run? START again to confirm, [C] to continue.'
          : 'Starting a new game will erase your saved run. [Enter] again to confirm, [C] to continue it.',
        cx,
        detailY + 124
      );
    } else {
      ctx.fillStyle = COLORS.stairs;
      ctx.fillText(
        `[C] Continue saved run: ${resume.name} — Depth ${resume.depth}, Turn ${resume.turn}`,
        cx,
        detailY + 124
      );
    }
    regions.push({ x: startX, y: detailY + 110, w: gridW, h: 28, action: { type: 'continueRun' } });
  }

  // Daily banner
  if (daily?.on) {
    const hero = CHARACTERS[daily.heroIndex];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = L.compact ? 'bold 12px monospace' : 'bold 14px monospace';
    ctx.fillStyle = COLORS.stairs;
    ctx.fillText(`DAILY CHALLENGE ${daily.date} \u2014 Hero: ${hero.name}`, cx, detailY + 150);
    ctx.font = L.compact ? '11px monospace' : '12px monospace';
    ctx.fillStyle = COLORS.textDim;
    const second = daily.result
      ? `Already played today: score ${daily.result.score}${daily.result.won ? ' (victory)' : ''}. Come back tomorrow.`
      : 'Same dungeon for everyone. One attempt.';
    ctx.fillText(second, cx, detailY + 168);
  } else if (shared) {
    const hero = CHARACTERS[shared.heroIndex];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = L.compact ? 'bold 12px monospace' : 'bold 14px monospace';
    ctx.fillStyle = COLORS.stairs;
    ctx.fillText(`SHARED RUN ${shared.code} \u2014 Hero: ${hero.name}`, cx, detailY + 150);
    ctx.font = L.compact ? '11px monospace' : '12px monospace';
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('Everyone with this code plays the same dungeon. [Enter] to start.', cx, detailY + 168);
  } else if (sharedError) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = L.compact ? 'bold 12px monospace' : 'bold 14px monospace';
    ctx.fillStyle = '#ff5555';
    ctx.fillText('Run code not recognised. Codes look like 1z8k3f-7.', cx, detailY + 150);
  }

  return regions;
}

export function drawGameOver(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  shareStatus: string = ''
): HitRegion[] {
  const regions: HitRegion[] = [];
  const L = getLayout();
  const H = canvasHeightFor('gameover', L);
  const cx = L.mapW / 2;
  const cy = H / 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, L.mapW, H);

  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  if (state.won) {
    ctx.fillStyle = '#ffcc00';
    ctx.fillText('VICTORY', cx, cy - 60);
    ctx.fillStyle = '#ffd700';
    ctx.font = '14px monospace';
    ctx.fillText(`You slew the Overlord on depth ${BOSS_DEPTH}.`, cx, cy - 30);
  } else {
    ctx.fillStyle = '#cc3333';
    ctx.fillText('GAME OVER', cx, cy - 60);
  }

  if (state.mode === 'daily' && state.dailyDate) {
    ctx.fillStyle = COLORS.stairs;
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`DAILY CHALLENGE ${state.dailyDate}`, cx, cy - 88);
  }

  ctx.fillStyle = COLORS.textBright;
  ctx.font = '18px monospace';
  ctx.fillText(`Score: ${state.score}`, cx, cy - 10);
  ctx.fillText(`Depth Reached: ${state.depth}`, cx, cy + 20);
  ctx.fillText(`Turns Survived: ${state.turn}`, cx, cy + 50);
  ctx.fillStyle = '#ffd700';
  ctx.fillText(`Gold Collected: ${state.treasureCollected}`, cx, cy + 80);

  // Free-play and shared runs can be replayed from their code
  if (state.mode !== 'daily') {
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '12px monospace';
    ctx.fillText(`Run code: ${formatRunCode(state.seed, state.heroIndex)}`, cx, cy + 100);
  }

  // High scores
  if (state.highScores.length > 0) {
    ctx.fillStyle = COLORS.stairs;
    ctx.font = 'bold 16px monospace';
    ctx.fillText('HIGH SCORES', cx, cy + 120);
    ctx.font = '14px monospace';
    ctx.fillStyle = COLORS.text;
    state.highScores.slice(0, 5).forEach((score, i) => {
      ctx.fillText(`${i + 1}. ${score}`, cx, cy + 145 + i * 20);
    });
  }

  // Share options
  const shareY = cy + 255;
  ctx.fillStyle = COLORS.stairs;
  ctx.font = 'bold 14px monospace';
  ctx.fillText('SHARE YOUR RESULT', cx, shareY);

  ctx.font = '13px monospace';
  const options = [
    { key: 'M', label: 'Mastodon', color: '#6364ff' },
    { key: 'B', label: 'Bluesky', color: '#0085ff' },
    { key: 'C', label: 'Copy', color: '#88cc88' },
  ];
  const optionW = 140;
  const totalW = options.length * optionW;
  const startX = (L.mapW - totalW) / 2;

  options.forEach((opt, i) => {
    const x = startX + i * optionW + optionW / 2;
    const y = shareY + 22;
    ctx.fillStyle = opt.color;
    ctx.fillText(`[${opt.key}] ${opt.label}`, x, y);
    regions.push({ x: startX + i * optionW, y: shareY + 8, w: optionW, h: 28, action: { type: 'share', target: opt.key.toLowerCase() as 'm' | 'b' | 'c' } });
  });

  // Share status feedback
  if (shareStatus) {
    ctx.fillStyle = '#88ff88';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(shareStatus, cx, shareY + 46);
  }

  // Play again
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '14px monospace';
  ctx.fillText('[Enter] or tap here to play again', cx, shareY + 70);
  regions.push({ x: cx - 150, y: shareY + 56, w: 300, h: 28, action: { type: 'playAgain' } });

  return regions;
}
