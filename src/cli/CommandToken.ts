/** Immutable lexical value; quoted distinguishes literal "in" from a clause. */
export interface CommandToken {
  readonly value: string;
  readonly quoted: boolean;
}
