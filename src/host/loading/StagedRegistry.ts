import { ExtensionRegistry, type ExtensionRegistrations } from '@svgframe/core';

/** Activation reads through previous contributions but writes only to its local staging area. */
export class StagedRegistry<T extends { readonly name: string }> implements ExtensionRegistrations<T> {
  readonly #local: ExtensionRegistry<T>;
  #state: 'open' | 'committed' | 'discarded' = 'open';
  #failure: unknown;
  public constructor(private readonly category: string, private readonly target: ExtensionRegistrations<T>) {
    this.#local = new ExtensionRegistry<T>(category);
  }
  public register(extension: T): void {
    if (this.#state !== 'open') throw new Error('plugin registration is closed');
    try {
      if (extension && this.target.get(extension.name)) throw new Error(`duplicate registration: ${this.category}/${extension.name}`);
      this.#local.register(extension);
    } catch (error) { this.#failure = error; throw error; }
  }
  public get(name: string): T | undefined { return this.#state === 'open' ? this.#local.get(name) ?? this.target.get(name) : this.target.get(name); }
  public values(): readonly T[] { return this.#state === 'open' ? Object.freeze([...this.target.values(), ...this.#local.values()]) : this.target.values(); }
  public pending(): readonly T[] { return this.#local.values(); }
  public verify(): void { if (this.#failure !== undefined) throw this.#failure; }
  public commit(): { dispose(): void } {
    if (!(this.target instanceof ExtensionRegistry)) throw new Error('plugin target must use the core registry');
    const receipt = this.target.registerBatch(this.#local.values());
    this.#state = 'committed';
    return receipt;
  }
  public discard(): void { this.#state = 'discarded'; }
}
