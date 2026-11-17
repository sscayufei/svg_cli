/** Ordered, instance-owned registry; atomic plugin installation belongs to the host. */
export class ExtensionRegistry<T extends { readonly name: string }> {
  readonly #entries = new Map<string, T>();
  public constructor(private readonly category: string) {}
  public register(extension: T): void {
    if (!extension || typeof extension.name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(extension.name)) throw new Error(`invalid registration: ${this.category}`);
    if (this.#entries.has(extension.name)) throw new Error(`duplicate registration: ${this.category}/${extension.name}`);
    const methods: Readonly<Record<string, readonly string[]>> = { shapes: ['create', 'fromAttributes'], commands: ['build'], attributes: ['handles', 'plan'], decorators: ['decorate'] };
    for (const name of methods[this.category] ?? []) {
      if (typeof Reflect.get(extension, name) !== 'function') throw new Error(`invalid registration contract: ${this.category}/${extension.name}`);
    }
    this.#entries.set(extension.name, extension);
  }
  public get(name: string): T | undefined { return this.#entries.get(name); }
  public values(): readonly T[] { return Object.freeze([...this.#entries.values()]); }
}
