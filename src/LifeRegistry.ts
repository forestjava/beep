/**
 * Narrow registry API used by {@link Cell} so it need not import {@link Lifecycle}
 * (avoids Cell ↔ Lifecycle circular module dependency).
 */
export interface LifeRegistry<T> {
  register(cell: T): Promise<void>;
  unregister(cell: T): Promise<void>;
  update(cell: T): Promise<void>;
}
