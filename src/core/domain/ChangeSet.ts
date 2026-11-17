/** Each individual step must apply/revert atomically. */
export interface ReversibleStep {
  apply(): void;
  revert(): void;
}

/** Local reversible changes, with rollback of completed atomic steps. No history. */
export class ChangeSet {
  readonly #steps: readonly ReversibleStep[];
  #applied = false;

  public constructor(steps: readonly ReversibleStep[]) {
    this.#steps = Object.freeze(steps.map(step => Object.freeze({ apply: step.apply, revert: step.revert })));
  }

  public static combine(changes: readonly ChangeSet[]): ChangeSet {
    return new ChangeSet(changes.map(change => ({ apply: () => change.apply(), revert: () => change.revert() })));
  }

  /** Transfer already-applied atomic records into one reversible unit. */
  public static fromApplied(changes: readonly ChangeSet[]): ChangeSet {
    if (changes.some(change => !change.#applied)) throw new Error('cannot adopt unapplied change');
    const result = ChangeSet.combine(changes);
    result.#applied = true;
    return result;
  }

  public applyChecked<T>(check: () => T): T {
    this.apply();
    try { return check(); } catch (error) { this.revert(); throw error; }
  }

  public revertChecked<T>(check: () => T): T {
    this.revert();
    try { return check(); } catch (error) { this.apply(); throw error; }
  }

  public apply(): void {
    if (this.#applied) throw new Error('change is already applied');
    const completed: ReversibleStep[] = [];
    try {
      for (const step of this.#steps) {
        step.apply(); completed.push(step);
      }
    } catch (error) {
      for (const step of completed.toReversed()) step.revert();
      throw error;
    }
    this.#applied = true;
  }

  public revert(): void {
    if (!this.#applied) throw new Error('change is not applied');
    const completed: ReversibleStep[] = [];
    try {
      for (const step of this.#steps.toReversed()) {
        step.revert(); completed.push(step);
      }
    } catch (error) {
      for (const step of completed.toReversed()) step.apply();
      throw error;
    }
    this.#applied = false;
  }
}
