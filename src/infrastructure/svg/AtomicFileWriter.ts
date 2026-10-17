import { closeSync, fsyncSync, openSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';

type FileOperations = Pick<typeof import('node:fs'),
  'openSync' | 'writeFileSync' | 'fsyncSync' | 'closeSync' | 'renameSync' | 'unlinkSync'>;

/** Same-directory replacement avoids truncating the target before a complete write. */
export class AtomicFileWriter {
  public constructor(private readonly files: FileOperations = {
    openSync, writeFileSync, fsyncSync, closeSync, renameSync, unlinkSync,
  }) {}

  public write(path: string, content: string): void {
    const target = resolve(path);
    const temporary = join(dirname(target), `.${basename(target)}.${randomUUID()}.tmp`);
    let descriptor: number | undefined;
    let ownsTemporary = false;
    try {
      descriptor = this.files.openSync(temporary, 'wx');
      ownsTemporary = true;
      this.files.writeFileSync(descriptor, content, 'utf8');
      this.files.fsyncSync(descriptor);
      this.files.closeSync(descriptor);
      descriptor = undefined;
      this.files.renameSync(temporary, target);
      ownsTemporary = false;
    } finally {
      // Cleanup must not mask the original write/rename error.
      if (descriptor !== undefined) {
        try { this.files.closeSync(descriptor); } catch { /* Best effort after failure. */ }
      }
      if (ownsTemporary) {
        try { this.files.unlinkSync(temporary); } catch { /* Best effort after failure. */ }
      }
    }
  }
}
