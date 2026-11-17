import { readFileSync } from 'node:fs';
import * as ts from 'typescript/unstable/ast';
import { API } from 'typescript/unstable/sync';

const decisions = new Set([ts.SyntaxKind.IfStatement, ts.SyntaxKind.ForStatement, ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.ForInStatement, ts.SyntaxKind.WhileStatement, ts.SyntaxKind.DoStatement, ts.SyntaxKind.CaseClause,
  ts.SyntaxKind.CatchClause, ts.SyntaxKind.ConditionalExpression]);
const logical = new Set([ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken, ts.SyntaxKind.BarBarEqualsToken, ts.SyntaxKind.QuestionQuestionEqualsToken]);
const functions = new Set([ts.SyntaxKind.FunctionDeclaration, ts.SyntaxKind.FunctionExpression, ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration, ts.SyntaxKind.Constructor, ts.SyntaxKind.GetAccessor, ts.SyntaxKind.SetAccessor]);
const literals = new Set([ts.SyntaxKind.StringLiteral, ts.SyntaxKind.NoSubstitutionTemplateLiteral, ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle, ts.SyntaxKind.TemplateTail, ts.SyntaxKind.RegularExpressionLiteral]);

export function measureSource(text, source) {
  const lines = text.split('\n'); if (lines.at(-1) === '') lines.pop();
  const starts = [0]; for (let index = 0; index < text.length; index++) if (text[index] === '\n') starts.push(index + 1);
  const lineOf = position => { let low = 0, high = starts.length; while (low + 1 < high) { const middle = (low + high) >>> 1; if (starts[middle] <= position) low = middle; else high = middle; } return low; };
  const occupied = new Set();
  const mark = (start, end) => { for (let line = lineOf(start); line <= lineOf(Math.max(start, end - 1)); line++) if (/\S/.test(text.slice(Math.max(start, starts[line]), Math.min(end, starts[line + 1] ?? text.length)))) occupied.add(line); };
  const spans = new Map(); const records = []; const top = { complexity: 0 };
  const visit = (node, owner) => {
    if (literals.has(node.kind)) spans.set(node.getStart(source), node.end);
    let scope = owner;
    if (functions.has(node.kind) && node.body) {
      scope = { name: node.name?.getText(source) ?? (node.kind === ts.SyntaxKind.Constructor ? 'constructor' : '(anonymous)'), line: lineOf(node.getStart(source)) + 1, complexity: 1 };
      records.push(scope);
    }
    if (decisions.has(node.kind) || (ts.isBinaryExpression(node) && logical.has(node.operatorToken.kind))) scope.complexity++;
    node.forEachChild(child => { visit(child, scope); });
  };
  visit(source, top);
  const scanner = ts.createScanner(false, ts.LanguageVariant.Standard, text);
  const trivia = new Set([ts.SyntaxKind.WhitespaceTrivia, ts.SyntaxKind.NewLineTrivia, ts.SyntaxKind.SingleLineCommentTrivia, ts.SyntaxKind.MultiLineCommentTrivia, ts.SyntaxKind.ShebangTrivia]);
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFile; token = scanner.scan()) {
    const start = scanner.getTokenStart(); const end = spans.get(start);
    if (end !== undefined) { mark(start, end); scanner.resetTokenState(end); }
    else if (!trivia.has(token)) mark(start, scanner.getTokenEnd());
  }
  return { physicalLines: lines.length, codeLines: occupied.size, functionCount: records.length,
    functionComplexity: records.reduce((sum, record) => sum + record.complexity, 0), topLevelDecisions: top.complexity, functions: records };
}

export function measureFiles(files, cwd) {
  const api = new API({ cwd }); const snapshot = api.updateSnapshot({ openFiles: files });
  try { return files.map(file => {
    const source = snapshot.getDefaultProjectForFile(file)?.program.getSourceFile(file);
    if (!source) throw new Error(`cannot parse source: ${file}`);
    return { file, ...measureSource(readFileSync(file, 'utf8'), source) };
  }); } finally { snapshot.dispose(); api.close(); }
}
