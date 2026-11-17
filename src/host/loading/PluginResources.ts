import type { ResourceOwner, SessionEvent, SessionEventSource, Subscription } from '@svgframe/core';

/** Dormant subscriptions become live only after the registration transaction commits. */
export class PluginResources implements ResourceOwner, SessionEventSource, Subscription {
  readonly #resources: Subscription[] = [];
  readonly #subscriptions: { listener: (event: SessionEvent) => void; disposed: boolean; live?: Subscription }[] = [];
  readonly #errors: string[] = [];
  #state: 'staged' | 'active' | 'disposed' = 'staged';
  public constructor(private readonly source: SessionEventSource) {}
  public get diagnostics(): readonly string[] { return Object.freeze([...this.source.diagnostics, ...this.#errors]); }
  public get cleanupErrors(): readonly string[] { return Object.freeze([...this.#errors]); }
  public add(resource: Subscription): void {
    if (this.#state === 'disposed') { this.release(resource); throw new Error('plugin resources are closed'); }
    if (!resource || typeof resource.dispose !== 'function') throw new Error('invalid plugin resource');
    this.#resources.push(resource);
  }
  public subscribe(listener: (event: SessionEvent) => void): Subscription {
    if (this.#state === 'disposed') throw new Error('plugin resources are closed');
    const record: { listener: (event: SessionEvent) => void; disposed: boolean; live?: Subscription } = { listener, disposed: false };
    this.#subscriptions.push(record);
    if (this.#state === 'active') record.live = this.source.subscribe(listener);
    return Object.freeze({ dispose: () => { record.disposed = true; record.live?.dispose(); } });
  }
  public commit(): void {
    for (const record of this.#subscriptions) if (!record.disposed) record.live = this.source.subscribe(record.listener);
    this.#state = 'active';
  }
  public dispose(): void {
    if (this.#state === 'disposed') return;
    this.#state = 'disposed';
    for (const record of this.#subscriptions.toReversed()) if (record.live) this.release(record.live);
    for (const resource of this.#resources.toReversed()) this.release(resource);
  }
  private release(resource: Subscription): void {
    try { resource.dispose(); } catch (error) { this.#errors.push(error instanceof Error ? error.message.replace(/[\r\n]+/g, ' ') : 'resource disposal failed'); }
  }
}
