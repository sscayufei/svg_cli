/** Shared lexical validation for SVG decimal numbers and numeric requests. */
export class SvgNumber {
  public static parse(input: string | number, name: string): number {
    const decimal = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
    if ((typeof input === 'string' && !decimal.test(input)) || !Number.isFinite(Number(input))) {
      throw new Error(`${name} must be a finite number`);
    }
    return Number(input);
  }
}
