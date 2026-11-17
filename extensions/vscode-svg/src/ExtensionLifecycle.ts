/** Owns extension resources; disposing twice is safe for host shutdown. */
export class ExtensionLifecycle {
  #disposed = false;
  readonly #resources: readonly { dispose(): void }[];

  public constructor(resources: readonly { dispose(): void }[] = []) {
    this.#resources = [...resources];
  }

  public get disposed(): boolean { return this.#disposed; }

  public dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const resource of [...this.#resources].reverse()) resource.dispose();
  }
}
