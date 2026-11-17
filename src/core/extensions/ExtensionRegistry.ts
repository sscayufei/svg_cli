/** Ordered, instance-owned registry; atomic plugin installation belongs to the host. */
export interface ExtensionRegistrations<T extends { readonly name: string }> {
  register(extension: T): void;
  get(name: string): T | undefined;
  values(): readonly T[];
}

export class ExtensionRegistry<T extends { readonly name: string }> implements ExtensionRegistrations<T> {
  #entries = new Map<string, T>();
  public constructor(private readonly category: string) {}
  public register(extension: T): void {
    this.registerBatch([extension]);
  }
  /** Host commit primitive: validate a candidate map first, and return an exact rollback receipt. */
  public registerBatch(extensions: readonly T[]): { dispose(): void } {
    const before = this.#entries;
    const candidate = new Map(before);
    for (const extension of extensions) {
      if (!extension || typeof extension.name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(extension.name)) throw new Error(`invalid registration: ${this.category}`);
      if (candidate.has(extension.name)) throw new Error(`duplicate registration: ${this.category}/${extension.name}`);
      const methods: Readonly<Record<string, readonly string[]>> = { shapes: ['create', 'fromAttributes'], commands: ['build'], attributes: ['handles', 'apply'], decorators: ['decorate'] };
      for (const name of methods[this.category] ?? []) {
        if (typeof Reflect.get(extension, name) !== 'function') throw new Error(`invalid registration contract: ${this.category}/${extension.name}`);
      }
      const help: unknown = this.category === 'shapes' ? Reflect.get(extension, 'help') : this.category === 'commands' ? extension : undefined;
      if ((this.category === 'shapes' || this.category === 'commands') && (!help || typeof help !== 'object' || typeof Reflect.get(help, 'syntax') !== 'string' || typeof Reflect.get(help, 'description') !== 'string')) throw new Error(`invalid registration contract: ${this.category}/${extension.name}`);
      candidate.set(extension.name, extension);
    }
    this.#entries = candidate;
    let active = true;
    return Object.freeze({ dispose: () => {
      if (!active) return;
      if (this.#entries !== candidate) throw new Error('registration state changed during rollback');
      this.#entries = before; active = false;
    } });
  }
  public get(name: string): T | undefined { return this.#entries.get(name); }
  public values(): readonly T[] { return Object.freeze([...this.#entries.values()]); }
}
