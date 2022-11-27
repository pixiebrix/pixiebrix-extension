/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

// The logic here is heavily based on the nunjucks-variable-parser
// https://github.com/archersado/nunjucks-variable-parser

import { joinName } from "@/utils";
import * as nunjucks from "nunjucks";

// The typings of nunjucks do not expose parser and nodes
// Have to hack the types
const { parser, nodes } = nunjucks as any;

const VARIABLE_PARENT_SYMBOL = Symbol("#Variable_parent");
const VARIABLE_CHILDREN_SYMBOL = Symbol("#Variable_children");
const VARIABLE_TYPE_SYMBOL = Symbol("#Variable_type");
const VARIABLE_START_INDEX = Symbol("#Variable_start_index");

export interface VariableOptions {
  type?: string;
  parent?: Variable | undefined;
  startIndex: number;
}

const {
  LookupVal,
  Symbol: NodeSymbol,
  Pair,
  Compare,
  Filter,
  FunCall,
  For,
  If,
  Literal,
} = nodes;

const expressionTags = [
  "And",
  "Or",
  "Not",
  "Add",
  "Sub",
  "Mul",
  "Div",
  "Mod",
  "Pow",
  "Neg",
  "Pos",
  "FloorDiv",
];

export class Variable {
  value: string;
  [VARIABLE_PARENT_SYMBOL]: Variable | undefined;
  [VARIABLE_CHILDREN_SYMBOL]: Variable[];
  [VARIABLE_TYPE_SYMBOL]: string;
  [VARIABLE_START_INDEX]: number;

  constructor(value: string, options: VariableOptions) {
    const { type = "string", parent, startIndex } = options;

    this[VARIABLE_PARENT_SYMBOL] = parent;
    this[VARIABLE_CHILDREN_SYMBOL] = [];
    this[VARIABLE_TYPE_SYMBOL] = type;
    this[VARIABLE_START_INDEX] = startIndex;
    this.value = value;
  }

  get parent() {
    return this[VARIABLE_PARENT_SYMBOL];
  }

  set parent(parent) {
    this[VARIABLE_PARENT_SYMBOL] = parent;
  }

  get children() {
    return this[VARIABLE_CHILDREN_SYMBOL];
  }

  addChild(child: Variable) {
    this[VARIABLE_CHILDREN_SYMBOL].push(child);
  }

  get type() {
    return this[VARIABLE_TYPE_SYMBOL];
  }

  set type(type) {
    this[VARIABLE_TYPE_SYMBOL] = type;
  }

  get startIndex() {
    return this[VARIABLE_START_INDEX];
  }
}

function traverseNode(node: any, inLoop = false) {
  if (node instanceof NodeSymbol) {
    return [new Variable(node.value, { startIndex: node.colno })];
  }

  if (node instanceof Pair) {
    return parsePair(node, inLoop);
  }

  if (node instanceof LookupVal) {
    return parseLookUp(node, inLoop);
  }

  if (node instanceof For) {
    return parseFor(node);
  }

  if (node instanceof If) {
    return parseIf(node, inLoop);
  }

  if (node instanceof FunCall || node instanceof Filter) {
    return parseFnOrFilter(node, inLoop);
  }

  if (expressionTags.includes(node.typename)) {
    return parseExpression(node, inLoop);
  }

  if (node instanceof Compare) {
    return parseCompare(node, inLoop);
  }

  return [];
}

function traverse(ast: any, inLoop = false): Variable[] {
  if (!ast.children) {
    return traverseNode(ast, inLoop);
  }

  const variables: Variable[] = [];
  for (const node of ast.children) {
    variables.push(...traverse(node, inLoop));
  }

  return variables;
}

function parseCompare(node: any, inLoop = false): any {
  if (!(node instanceof Compare)) {
    throw new TypeError(
      `Current node type is not Compare, it is ${node.typename}`
    );
  }

  const { expr } = node;

  return traverse(expr, inLoop);
}

function parseFnOrFilter(node: any, inLoop = false) {
  if (!(node instanceof FunCall) && !(node instanceof Filter)) {
    throw new TypeError(
      `Current node type is not FunCall or Filter, it is ${node.typename}`
    );
  }

  const { args } = node;

  return traverse(args, inLoop);
}

function parseExpression(node: any, inLoop = false) {
  if (!expressionTags.includes(node.typename)) {
    throw new TypeError(
      `Current node type is not in Expression, it is ${node.typename}`
    );
  }

  const { left, right } = node;

  return [...traverse(left, inLoop), ...traverse(right, inLoop)];
}

function parseIf(node: any, inLoop = false) {
  if (!(node instanceof If)) {
    throw new TypeError(
      `Current node type is not LookupVal, it is ${node.typename}`
    );
  }

  const { body, cond, else_ } = node;

  return [...traverse(body, inLoop), ...traverse(cond, inLoop)].concat(
    else_ ? traverse(else_, inLoop) : []
  );
}

function parseLookUp(node: any, inLoop = false): Variable[] {
  if (!(node instanceof LookupVal)) {
    throw new TypeError(
      `Current node type is not LookupVal, it is ${node.typename}`
    );
  }

  const { target, val } = node;
  if (target.value === "loop") {
    return [];
  }

  const targetVars =
    target instanceof NodeSymbol
      ? [
          new Variable(target.value, {
            type: "object",
            startIndex: target.colno,
          }),
        ]
      : parseLookUp(target, inLoop);

  if (val instanceof Literal) {
    const parentVar = targetVars.at(-1);
    const newVar = new Variable(val.value, {
      parent: parentVar,
      startIndex: val.colno,
    });
    parentVar.addChild(newVar);
    return [...targetVars, newVar];
  }

  return [...targetVars, ...traverse(val, inLoop)];
}

function parsePair(node: any, inLoop = false) {
  if (!(node instanceof Pair)) {
    throw new TypeError(
      `Current node type is not Pair, it is ${node.typename}`
    );
  }

  const { key, value } = node;
  return [...traverse(key, inLoop), ...traverse(value, inLoop)];
}

function parseFor(node: any) {
  if (!(node instanceof For)) {
    throw new TypeError(`Current node type is not For, it is ${node.typename}`);
  }

  const { arr: listNode, name: itemNode, body } = node;
  const variables: Variable[] = [];

  let listVars: Variable[];
  if (listNode instanceof NodeSymbol) {
    const listVar = new Variable(listNode.value, {
      type: "list",
      startIndex: listNode.colno,
    });
    listVars = [listVar];
    variables.push(listVar);
  } else {
    listVars = traverse(listNode, true);
    variables.push(...listVars);
  }

  let itemVars: Variable[];
  if (itemNode instanceof NodeSymbol) {
    const itemVar = new Variable(itemNode.value, {
      startIndex: itemNode.colno,
    });
    itemVars = [itemVar];
  } else {
    itemVars = traverse(itemNode, true);
  }

  const bodyVars = traverse(body, true);
  const bodyVarsFromContext = bodyVars.filter((bodyVar) =>
    itemVars.every((itemVar) => {
      if (itemVar.value === bodyVar.value) {
        return false;
      }

      let { parent } = itemVar;
      while (parent) {
        if (parent.value === bodyVar.value) {
          return false;
        }

        parent = parent.parent;
      }

      return true;
    })
  );

  variables.push(...bodyVarsFromContext);

  return variables;
}

function getVariableName(variable: Variable, path = ""): string {
  const joinedName = joinName(path, String(variable.value));
  if (variable.children.length > 0) {
    return getVariableName(variable.children[0], joinedName);
  }

  return joinedName;
}

export function parseTemplateVariables(template: string): string[] {
  const ast = parser.parse(template, true);
  return traverse(ast)
    .filter((x) => x.parent == null)
    .map((x) => getVariableName(x));
}

export function getVariableAtPosition(
  template: string,
  position: number
): string | null {
  const ast = parser.parse(template, true);
  const variables = traverse(ast);

  for (const variable of variables) {
    if (variable[VARIABLE_PARENT_SYMBOL] == null) {
      const varName = getVariableName(variable);
      const startIndex = template.indexOf(
        varName,
        position <= varName.length ? position : position - varName.length
      );

      if (startIndex <= position && position < startIndex + varName.length) {
        return varName;
      }
    }
  }

  return null;
}

export default parseTemplateVariables;
