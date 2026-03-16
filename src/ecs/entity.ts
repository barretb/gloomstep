import { Entity } from '../types';

let nextId = 1;

export function createEntity(partial: Partial<Entity> = {}): Entity {
  return {
    id: nextId++,
    ...partial,
  };
}

export function resetEntityIds(): void {
  nextId = 1;
}
