/*
 * Copyright (C) 2023 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import nunjucks from "nunjucks";
import { Editor, Transforms, Node, Point, type Descendant } from "slate";

interface BaseToken {
  type: string;
  value: string;
}

const tokenGroups: Record<string, string> = {
  [nunjucks.lexer.TOKEN_BLOCK_START]: nunjucks.lexer.TOKEN_BLOCK_END,
  [nunjucks.lexer.TOKEN_VARIABLE_START]: nunjucks.lexer.TOKEN_VARIABLE_END,
};

const getTokenValue = (token: BaseToken) =>
  token.type === "string" ? `"${token.value}"` : token.value;

/**
 * Tokenize a string template based on things we want to highlight
 */
export const tokenize = (text: string) => {
  const tokenizer = nunjucks.lexer.lex(text);

  const buf = [];
  let token: BaseToken;

  function getUntil(endType: string) {
    const start = token;
    const contents: BaseToken[] = [];
    let next: BaseToken = tokenizer.nextToken();

    while (next && next.type !== endType) {
      contents.push(next);
      next = tokenizer.nextToken();
    }

    return [start, ...contents, next].filter(Boolean);
  }

  while ((token = tokenizer.nextToken())) {
    if (tokenGroups[token.type]) {
      // Add groups as a single token
      const groupTokens = getUntil(tokenGroups[token.type]);
      buf.push({
        type: "variable",
        text: groupTokens.map((t) => getTokenValue(t)).join(""),
      });
    } else {
      buf.push(getTokenValue(token));
    }
  }

  return buf;
};

const serializeNode = (node: Descendant): string => {
  if ("text" in node) return node.text;
  return node.children.map((n) => serializeNode(n)).join("");
};

export const serialize = (doc: Descendant[]) =>
  doc.map((n) => serializeNode(n)).join("\n");

export const deserialize = (str: string): Descendant[] =>
  str.split("\n").map((s) => ({ type: "paragraph", children: [{ text: s }] }));

// Reset Slate.js's internal state
// https://github.com/ianstormtaylor/slate/pull/4540#issuecomment-951903419
export const resetNodes = (
  editor: Editor,
  options: {
    nodes?: Node | Node[];
    at?: Location;
  } = {}
): void => {
  const children = [...editor.children];
  for (const node of children) {
    editor.apply({ type: "remove_node", path: [0], node });
  }

  if (options.nodes) {
    const nodes = Node.isNode(options.nodes) ? [options.nodes] : options.nodes;

    for (const [i, node] of nodes.entries()) {
      editor.apply({ type: "insert_node", path: [i], node });
    }
  }

  const point =
    options.at && Point.isPoint(options.at)
      ? options.at
      : Editor.end(editor, []);
  if (point) Transforms.select(editor, point);
};
