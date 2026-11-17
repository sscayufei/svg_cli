export interface DirectoryEntry {
  readonly name: string;
  readonly kind: 'directory' | 'file' | 'link' | 'other';
}

/** A direct listing of the startup working directory; never follows links or changes cwd. */
export interface DirectoryPort {
  readonly path: string;
  read(): readonly DirectoryEntry[];
}
