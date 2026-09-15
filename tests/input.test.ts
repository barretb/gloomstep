import { describe, it, expect } from 'vitest';
import { keyToAction } from '../src/systems/input';

describe('keyToAction', () => {
  it.each(['w', 'a', 's', 'd', 'g', 'i', '>', '.', 'ArrowUp'])(
    'ignores game key %s while on the character select screen',
    (key) => {
      expect(keyToAction(key, 'charselect')).toBeNull();
    }
  );

  it('uses inventory slot 10 when 0 is pressed', () => {
    expect(keyToAction('0', 'inventory')).toEqual({ type: 'useItem', index: 9 });
  });

  it('drops inventory slot 10 when shift+0 is pressed', () => {
    expect(keyToAction(')', 'inventory')).toEqual({ type: 'dropItem', index: 9 });
  });
});
