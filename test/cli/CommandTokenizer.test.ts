import { describe, expect, it } from 'vitest';
import { CommandTokenizer } from '../../src/cli/CommandTokenizer.js';

describe('CommandTokenizer', () => {
  const tokenizer = new CommandTokenizer();

  it.each(['', '   \t', '# comment', '  # 中文注释'])('ignores blank/comment input %j', line => {
    expect(tokenizer.tokenize(line)).toEqual([]);
  });

  it('keeps quoted whitespace, empty text, color values and quote metadata', () => {
    expect(tokenizer.tokenize('create text t 1 2 "hello 世界" #abc "" "in"')).toEqual([
      { value: 'create', quoted: false }, { value: 'text', quoted: false },
      { value: 't', quoted: false }, { value: '1', quoted: false },
      { value: '2', quoted: false }, { value: 'hello 世界', quoted: true },
      { value: '#abc', quoted: false }, { value: '', quoted: true },
      { value: 'in', quoted: true },
    ]);
  });

  it('supports escaped quotes/backslashes and preserves other backslashes', () => {
    expect(tokenizer.tokenize(String.raw`"a \"quote\" \\ C:\temp"`)).toEqual([
      { value: String.raw`a "quote" \ C:\temp`, quoted: true },
    ]);
  });

  it.each(['"unclosed', 'a"b"', '"a"b'])('rejects malformed quoting %j', line => {
    expect(() => tokenizer.tokenize(line)).toThrow();
  });
});
