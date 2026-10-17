import type { CommandToken } from './CommandToken.js';

export class CommandTokenizer {
  public tokenize(line: string): readonly CommandToken[] {
    if (line.trimStart().startsWith('#')) return Object.freeze([]);
    const tokens: CommandToken[] = [];
    let value = '';
    let started = false;
    let quoted = false;
    let insideQuote = false;
    let closedQuote = false;
    const flush = () => {
      if (started) tokens.push(Object.freeze({ value, quoted }));
      value = '';
      started = quoted = closedQuote = false;
    };
    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (insideQuote) {
        const next = line[index + 1];
        if (char === '\\' && (next === '"' || next === '\\')) {
          value += next;
          index++;
        } else if (char === '"') {
          insideQuote = false;
          closedQuote = true;
        } else {
          value += char;
        }
      } else if (char !== undefined && /\s/.test(char)) {
        flush();
      } else if (closedQuote) {
        throw new Error('expected whitespace after quoted argument');
      } else if (char === '"') {
        if (started) throw new Error('unexpected quote in unquoted argument');
        started = quoted = insideQuote = true;
      } else {
        started = true;
        value += char;
      }
    }
    if (insideQuote) throw new Error('unterminated quoted argument');
    flush();
    return Object.freeze(tokens);
  }
}
