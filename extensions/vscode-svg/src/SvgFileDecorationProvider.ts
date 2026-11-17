import * as vscode from 'vscode';
import { SvgBadgePolicy } from './SvgBadgePolicy';

/** Adapts VSCode file metadata and watcher events to a read-only SVG badge. */
export class SvgFileDecorationProvider implements vscode.FileDecorationProvider, vscode.Disposable {
  readonly #policy = new SvgBadgePolicy();
  readonly #changes = new vscode.EventEmitter<vscode.Uri>();
  readonly #watcher = vscode.workspace.createFileSystemWatcher('**/*');
  readonly #subscriptions: vscode.Disposable[];
  #disposed = false;
  public readonly onDidChangeFileDecorations = this.#changes.event;

  public constructor() {
    const refresh = (uri: vscode.Uri) => {
      if (!this.#disposed && uri.path.toLowerCase().endsWith('.svg')) this.#changes.fire(uri);
    };
    this.#subscriptions = [this.#watcher.onDidCreate(refresh), this.#watcher.onDidChange(refresh), this.#watcher.onDidDelete(refresh)];
  }

  public async provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): Promise<vscode.FileDecoration | undefined> {
    if (this.#disposed) return undefined;
    const badge = await this.#policy.provide(uri.path, async () => {
      const stat = await vscode.workspace.fs.stat(uri);
      return (stat.type & vscode.FileType.File) !== 0 && (stat.type & vscode.FileType.Directory) === 0;
    }, token);
    return this.#disposed ? undefined : badge;
  }

  public dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const subscription of this.#subscriptions) subscription.dispose();
    this.#watcher.dispose();
    this.#changes.dispose();
  }
}
