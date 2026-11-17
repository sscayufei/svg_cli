import type { SessionSnapshot } from './SceneSnapshot.js';

export type DocumentEventKind = 'init' | 'read' | 'save' | 'canvas';
export type SessionEventKind = DocumentEventKind | 'edit' | 'undo' | 'redo';
export interface SessionEvent { readonly kind: SessionEventKind; readonly snapshot: SessionSnapshot }
export interface Subscription { dispose(): void }

/** Post-commit observers cannot change the outcome of an operation. */
export class SessionEvents {
  readonly #listeners = new Set<(event: SessionEvent) => void>();
  readonly #errors: string[] = [];
  public constructor(private readonly snapshot: () => SessionSnapshot) {}
  public get diagnostics(): readonly string[] { return Object.freeze([...this.#errors]); }
  public subscribe(listener: (event: SessionEvent) => void): Subscription {
    const observer = (event: SessionEvent) => listener(event);
    this.#listeners.add(observer);
    return Object.freeze({ dispose: () => { this.#listeners.delete(observer); } });
  }
  public publish(kind: SessionEventKind): void {
    // Snapshot creation is also an observer concern: a failed projection cannot undo a saved file.
    try {
      const event = Object.freeze({ kind, snapshot: this.snapshot() });
      for (const listener of [...this.#listeners]) {
        try { listener(event); } catch (error) { this.report(error); }
      }
    } catch (error) { this.report(error); }
  }
  private report(error: unknown): void {
    this.#errors.push(error instanceof Error ? error.message : 'lifecycle observer failed');
  }
}
