import { CANVAS_W, CANVAS_H, COLORS, TILE_SIZE, MAX_MESSAGES } from '../constants';
import { GameState } from '../types';
import { CHARACTERS } from '../data/characters';
import { SpriteMap } from './sprite-loader';

const HUD_HEIGHT = 120;
const HUD_Y = CANVAS_H;
const PADDING = 10;

export function getHudHeight(): number {
  return HUD_HEIGHT;
}

export function drawHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  // HUD background
  ctx.fillStyle = '#111122';
  ctx.fillRect(0, HUD_Y, CANVAS_W, HUD_HEIGHT);
  ctx.strokeStyle = COLORS.inventoryBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(0, HUD_Y, CANVAS_W, HUD_HEIGHT);

  const stats = state.player.stats!;
  const equip = state.player.equipment;

  // HP bar
  const barX = PADDING;
  const barY = HUD_Y + PADDING;
  const barW = 200;
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

  // Stats text
  const statsX = barX + barW + 20;
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`Depth: ${state.depth}`, statsX, barY + 8);
  ctx.fillText(`Level: ${stats.level}`, statsX, barY + 24);
  ctx.fillText(`ATK: ${stats.attack}${equip?.weapon?.item?.attackBonus ? '+' + equip.weapon.item.attackBonus : ''}`, statsX + 100, barY + 8);
  ctx.fillText(`DEF: ${stats.defense}${equip?.armor?.item?.defenseBonus ? '+' + equip.armor.item.defenseBonus : ''}`, statsX + 100, barY + 24);
  ctx.fillText(`Score: ${state.score}`, statsX + 200, barY + 8);
  ctx.fillText(`Turn: ${state.turn}`, statsX + 200, barY + 24);

  // Message log
  const msgX = PADDING;
  const msgY = xpBarY + barH + 8;
  const recentMessages = state.messages.slice(-MAX_MESSAGES);
  ctx.font = '11px monospace';
  recentMessages.forEach((msg, i) => {
    const alpha = 0.5 + 0.5 * ((i + 1) / recentMessages.length);
    ctx.fillStyle = `rgba(200, 200, 200, ${alpha})`;
    ctx.fillText(msg, msgX, msgY + i * 14);
  });
}

export function drawInventoryScreen(ctx: CanvasRenderingContext2D, state: GameState): void {
  const inv = state.player.inventory;
  if (!inv) return;

  // Overlay
  ctx.fillStyle = COLORS.inventoryBg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Border
  const panelX = 60;
  const panelY = 40;
  const panelW = CANVAS_W - 120;
  const panelH = CANVAS_H - 80;
  ctx.strokeStyle = COLORS.inventoryBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  // Title
  ctx.fillStyle = COLORS.textBright;
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('INVENTORY', CANVAS_W / 2, panelY + 30);

  ctx.textAlign = 'left';
  ctx.font = '14px monospace';

  const equip = state.player.equipment;

  // Equipment section
  let y = panelY + 60;
  ctx.fillStyle = COLORS.stairs;
  ctx.fillText('Equipment:', panelX + 20, y);
  y += 22;
  ctx.fillStyle = COLORS.text;
  const weaponName = equip?.weapon?.appearance?.name || '(none)';
  const weaponBonus = equip?.weapon?.item?.attackBonus
    ? `  (+${equip.weapon.item.attackBonus} ATK)`
    : '';
  ctx.fillText(`Weapon: ${weaponName}`, panelX + 30, y);
  if (weaponBonus) {
    ctx.fillStyle = '#88ff88';
    ctx.fillText(weaponBonus, panelX + 30 + ctx.measureText(`Weapon: ${weaponName}`).width, y);
  }
  y += 18;
  ctx.fillStyle = COLORS.text;
  const armorName = equip?.armor?.appearance?.name || '(none)';
  const armorBonus = equip?.armor?.item?.defenseBonus
    ? `  (+${equip.armor.item.defenseBonus} DEF)`
    : '';
  ctx.fillText(`Armor:  ${armorName}`, panelX + 30, y);
  if (armorBonus) {
    ctx.fillStyle = '#88aaff';
    ctx.fillText(armorBonus, panelX + 30 + ctx.measureText(`Armor:  ${armorName}`).width, y);
  }
  y += 26;

  // Stats summary
  const stats = state.player.stats!;
  const atkBonus = equip?.weapon?.item?.attackBonus ?? 0;
  const defBonus = equip?.armor?.item?.defenseBonus ?? 0;

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
      y += 18;
    });
  }

  // Help text
  y = panelY + panelH - 30;
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('[1-9] Use item  |  [Esc/i] Close', CANVAS_W / 2, y);
}

export function drawCharSelect(
  ctx: CanvasRenderingContext2D,
  selectedIndex: number,
  sprites: SpriteMap
): void {
  const totalH = CANVAS_H + getHudHeight();

  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, CANVAS_W, totalH);

  // Title
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CHOOSE YOUR HERO', CANVAS_W / 2, 40);

  // Grid layout
  const cols = 5;
  const cellW = 140;
  const cellH = 120;
  const gridW = cols * cellW;
  const startX = Math.floor((CANVAS_W - gridW) / 2);
  const startY = 65;

  CHARACTERS.forEach((char, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * cellW;
    const y = startY + row * cellH;

    const isSelected = i === selectedIndex;

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

    // Character sprite (scaled up 2x for visibility)
    const spriteSize = TILE_SIZE * 2;
    const spriteX = x + Math.floor((cellW - spriteSize) / 2);
    const spriteY = y + 8;
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

  ctx.fillStyle = 'rgba(40, 40, 60, 0.7)';
  ctx.fillRect(startX, detailY, gridW, 80);
  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth = 1;
  ctx.strokeRect(startX, detailY, gridW, 80);

  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(selected.name, CANVAS_W / 2, detailY + 20);

  ctx.fillStyle = COLORS.text;
  ctx.font = '13px monospace';
  const statsText = `HP: ${selected.stats.hp}  ATK: ${selected.stats.attack}  DEF: ${selected.stats.defense}`;
  ctx.fillText(statsText, CANVAS_W / 2, detailY + 42);

  // Controls
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px monospace';
  ctx.fillText('[Arrow Keys] Select   [Enter] Start', CANVAS_W / 2, detailY + 64);
}

export function drawGameOver(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  shareStatus: string = ''
): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H + getHudHeight());

  ctx.fillStyle = '#cc3333';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 60);

  ctx.fillStyle = COLORS.textBright;
  ctx.font = '18px monospace';
  ctx.fillText(`Score: ${state.score}`, CANVAS_W / 2, CANVAS_H / 2 - 10);
  ctx.fillText(`Depth Reached: ${state.depth}`, CANVAS_W / 2, CANVAS_H / 2 + 20);
  ctx.fillText(`Turns Survived: ${state.turn}`, CANVAS_W / 2, CANVAS_H / 2 + 50);

  // High scores
  if (state.highScores.length > 0) {
    ctx.fillStyle = COLORS.stairs;
    ctx.font = 'bold 16px monospace';
    ctx.fillText('HIGH SCORES', CANVAS_W / 2, CANVAS_H / 2 + 100);
    ctx.font = '14px monospace';
    ctx.fillStyle = COLORS.text;
    state.highScores.slice(0, 5).forEach((score, i) => {
      ctx.fillText(`${i + 1}. ${score}`, CANVAS_W / 2, CANVAS_H / 2 + 125 + i * 20);
    });
  }

  // Share options
  const shareY = CANVAS_H / 2 + 235;
  ctx.fillStyle = COLORS.stairs;
  ctx.font = 'bold 14px monospace';
  ctx.fillText('SHARE YOUR RESULT', CANVAS_W / 2, shareY);

  ctx.font = '13px monospace';
  const options = [
    { key: 'M', label: 'Mastodon', color: '#6364ff' },
    { key: 'B', label: 'Bluesky', color: '#0085ff' },
    { key: 'C', label: 'Copy', color: '#88cc88' },
  ];
  const optionW = 140;
  const totalW = options.length * optionW;
  const startX = (CANVAS_W - totalW) / 2;

  options.forEach((opt, i) => {
    const x = startX + i * optionW + optionW / 2;
    const y = shareY + 22;
    ctx.fillStyle = opt.color;
    ctx.fillText(`[${opt.key}] ${opt.label}`, x, y);
  });

  // Share status feedback
  if (shareStatus) {
    ctx.fillStyle = '#88ff88';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(shareStatus, CANVAS_W / 2, shareY + 46);
  }

  // Play again
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '14px monospace';
  ctx.fillText('Press [Enter] to play again', CANVAS_W / 2, shareY + 70);
}
