/** Minimal dependency-free typed event emitter (browser + Node safe). */
export type Listener<T> = (payload: T) => void;

export class TypedEmitter<EventMap> {
  private readonly listeners = new Map<keyof EventMap, Set<Listener<any>>>();

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<K extends keyof EventMap>(event: K, fn: Listener<EventMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn);
    return () => this.off(event, fn);
  }

  /** Subscribe to an event for a single firing. */
  once<K extends keyof EventMap>(event: K, fn: Listener<EventMap[K]>): () => void {
    const off = this.on(event, (payload) => {
      off();
      fn(payload);
    });
    return off;
  }

  /** Unsubscribe a previously registered listener. */
  off<K extends keyof EventMap>(event: K, fn: Listener<EventMap[K]>): void {
    this.listeners.get(event)?.delete(fn);
  }

  /** Remove all listeners (optionally for a single event). */
  removeAllListeners(event?: keyof EventMap): void {
    if (event === undefined) this.listeners.clear();
    else this.listeners.delete(event);
  }

  protected emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    // Copy so a listener that unsubscribes mid-dispatch doesn't skip siblings.
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch {
        // A throwing listener must not break the dispatch loop or the pipeline.
      }
    }
  }
}
