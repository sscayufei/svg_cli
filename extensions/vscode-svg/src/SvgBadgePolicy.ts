export interface BadgeCancellation { readonly isCancellationRequested: boolean }
export interface SvgBadge { readonly badge: string; readonly tooltip: string; readonly propagate: false }

/** Read-only file classification; injected stat keeps errors and races testable. */
export class SvgBadgePolicy {
  public async provide(path: string, isFile: () => Promise<boolean>, token: BadgeCancellation): Promise<SvgBadge | undefined> {
    if (token.isCancellationRequested || !path.toLowerCase().endsWith('.svg')) return undefined;
    try {
      if (!await isFile() || token.isCancellationRequested) return undefined;
      return { badge: '[]', tooltip: 'SVG file', propagate: false };
    } catch {
      // Deletion races and inaccessible files must not reject a host callback.
      return undefined;
    }
  }
}
