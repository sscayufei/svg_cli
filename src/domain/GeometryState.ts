import { ChangeSet } from './ChangeSet.js';
import type { SvgGeometry, SvgPoint } from './SvgAttributes.js';
import { SvgNumber } from './SvgNumber.js';

/** Encapsulated numeric value object; shape classes declare their own geometry. */
export class GeometryState {
  #values: SvgGeometry;
  readonly #xFields: readonly string[];
  readonly #yFields: readonly string[];
  readonly #nonNegative: ReadonlySet<string>;

  public constructor(values: SvgGeometry, xFields: readonly string[] = [], yFields: readonly string[] = [], nonNegative: readonly string[] = []) {
    this.#nonNegative = new Set(nonNegative);
    this.validate(values);
    this.#values = Object.freeze({ ...values });
    this.#xFields = Object.freeze([...xFields]);
    this.#yFields = Object.freeze([...yFields]);
    for (const name of [...xFields, ...yFields, ...nonNegative]) this.value(name);
  }

  public snapshot(): SvgGeometry { return this.#values; }
  public has(name: string): boolean { return Object.hasOwn(this.#values, name); }
  public value(name: string): number {
    const value = this.#values[name];
    if (value === undefined || !this.has(name)) throw new Error(`unknown attribute: ${name}`);
    return value;
  }

  public position(): SvgPoint | null {
    const x = this.#xFields[0]; const y = this.#yFields[0];
    return x === undefined || y === undefined ? null : Object.freeze({ x: this.value(x), y: this.value(y) });
  }

  public planMove(dx: number, dy: number): ChangeSet {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) throw new Error('movement must be finite');
    const next: Record<string, number> = {};
    for (const name of this.#xFields) next[name] = this.value(name) + dx;
    for (const name of this.#yFields) next[name] = this.value(name) + dy;
    return this.change(next);
  }

  public planScale(factor: number): ChangeSet {
    if (!Number.isFinite(factor) || factor <= 0) throw new Error('scale factor must be finite and positive');
    return this.change(Object.fromEntries(Object.entries(this.#values).map(([name, value]) => [name, value * factor])));
  }

  public planSet(name: string, input: string | number): ChangeSet {
    this.value(name);
    return this.change({ [name]: SvgNumber.parse(input, name) });
  }

  private validate(values: SvgGeometry): void {
    for (const [name, value] of Object.entries(values)) {
      if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
      if (this.#nonNegative.has(name) && value < 0) throw new Error(`${name} must be non-negative`);
    }
  }

  private change(next: SvgGeometry): ChangeSet {
    this.validate(next);
    const fields = Object.entries(next).map(([name, after]) => ({ name, before: this.value(name), after }));
    return new ChangeSet([{
      apply: () => { this.#values = Object.freeze({ ...this.#values, ...Object.fromEntries(fields.map(f => [f.name, f.after])) }); },
      revert: () => { this.#values = Object.freeze({ ...this.#values, ...Object.fromEntries(fields.map(f => [f.name, f.before])) }); },
    }]);
  }
}
