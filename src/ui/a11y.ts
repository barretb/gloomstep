import { BOSS_DEPTH } from '../constants';
import { ABILITIES } from '../data/abilities';
import { GameState } from '../types';

/** What the hero screen is showing, for the spoken summary. */
export interface HeroScreenInfo {
  selectedName: string;
  dailyDate: string | null;
  sharedCode: string | null;
  hasSave: boolean;
}

/**
 * One line describing the current screen, used as the canvas's accessible
 * name so screen readers can follow the game.
 */
export function describeState(state: GameState, hero: HeroScreenInfo): string {
  switch (state.uiMode) {
    case 'charselect': {
      const parts = [`Choose your hero. Selected: ${hero.selectedName}.`];
      if (hero.dailyDate) parts.push(`Daily challenge for ${hero.dailyDate}.`);
      if (hero.sharedCode) parts.push(`Shared run ${hero.sharedCode}.`);
      if (hero.hasSave) parts.push('A saved run can be continued.');
      return parts.join(' ');
    }
    case 'inventory': {
      const count = state.player.inventory?.items.length ?? 0;
      return `Inventory open. ${count} ${count === 1 ? 'item' : 'items'} carried.`;
    }
    case 'log': {
      const count = state.messages.length;
      return `Message log open. ${count} ${count === 1 ? 'message' : 'messages'}.`;
    }
    case 'gameover':
      return state.won
        ? `Victory! Score ${state.score}.`
        : `Game over. Score ${state.score} on depth ${state.depth}.`;
    case 'game': {
      const stats = state.player.stats!;
      const name = state.player.appearance?.name ?? 'Adventurer';
      const depth = state.depth >= BOSS_DEPTH ? `depth ${state.depth}, the final floor` : `depth ${state.depth}`;
      const parts = [`${name} on ${depth}.`, `HP ${stats.hp} of ${stats.maxHp}.`, `Turn ${state.turn}.`];
      const ability = state.player.ability;
      if (ability) {
        const def = ABILITIES[ability.id];
        parts.push(
          ability.cooldownRemaining === 0
            ? `${def.name} ready.`
            : `${def.name} ready in ${ability.cooldownRemaining} ${ability.cooldownRemaining === 1 ? 'turn' : 'turns'}.`
        );
      }
      return parts.join(' ');
    }
  }
}

/**
 * The messages added since `announcedCount` were last read out. If the
 * history was trimmed in between, the newest line is still announced.
 */
export function newMessages(announcedCount: number, messages: readonly string[]): string[] {
  if (messages.length >= announcedCount) return messages.slice(announcedCount);
  return messages.length > 0 ? [messages[messages.length - 1]] : [];
}

/** WCAG 2.x contrast ratio between two hex colours (#rrggbb). */
export function contrastRatio(foreground: string, background: string): number {
  const lf = relativeLuminance(foreground);
  const lb = relativeLuminance(background);
  const hi = Math.max(lf, lb);
  const lo = Math.min(lf, lb);
  return (hi + 0.05) / (lo + 0.05);
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const channel = (i: number) => {
    const c = parseInt(clean.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}
