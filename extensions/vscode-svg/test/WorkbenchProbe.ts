import { writeFileSync } from 'node:fs';

/** Test-only CDP client: inspects and captures the real Electron workbench. */
export class WorkbenchProbe {
  #next = 0;
  readonly #pending = new Map<number, { resolve(value: unknown): void; reject(error: Error): void }>();
  private constructor(private readonly socket: WebSocket) {
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data)) as { id: number; error?: unknown; result?: unknown };
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      this.#pending.delete(message.id);
      if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
      else pending.resolve(message.result);
    });
  }
  public static async connect(): Promise<WorkbenchProbe> {
    const response = await fetch(`http://127.0.0.1:${process.env.SVG_CDP_PORT}/json/list`);
    const targets = await response.json() as { type: string; url: string; webSocketDebuggerUrl: string }[];
    const target = targets.find(entry => entry.type === 'page' && entry.url.includes('workbench'));
    if (!target) throw new Error('workbench debug target not found');
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise<void>((resolve, reject) => { socket.addEventListener('open', () => resolve(), { once: true }); socket.addEventListener('error', () => reject(new Error('CDP connection failed')), { once: true }); });
    return new WorkbenchProbe(socket);
  }
  private async send<T = unknown>(method: string, params: object = {}): Promise<T> {
    const id = ++this.#next;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { this.#pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15_000);
      this.#pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value as T); }, reject: error => { clearTimeout(timeout); reject(error); } });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  public async evaluate<T = unknown>(expression: string): Promise<T> {
    const response = await this.send<{ result: { value: T }; exceptionDetails?: unknown }>('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  }
  public async capture(path: string): Promise<void> {
    const response = await this.send<{ data: string }>('Page.captureScreenshot', { format: 'png' });
    writeFileSync(path, Buffer.from(response.data, 'base64'));
  }
  public async click(expression: string, clickCount = 1): Promise<void> {
    const point = await this.evaluate<{ x: number; y: number }>(`(() => { const element = ${expression}; if (!element) throw new Error('element missing'); const r = element.getBoundingClientRect(); return { x:r.x+r.width/2, y:r.y+r.height/2 }; })()`);
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount, ...point });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount, ...point });
  }
  public dispose(): void { this.socket.close(); }
}
