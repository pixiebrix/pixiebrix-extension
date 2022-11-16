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

// Imported from nunjucks-variable-parser with some modifications
import { merge } from "lodash";
import { parser, nodes } from "nunjucks";

const VARIABLE_PARENT_SYMBOL = Symbol("#Variable_parent");
const VARIABLE_TYPE_SYMBOL = Symbol("#Variable_type");

export interface VariableOptions {
  type: string;
  parent: Variable | undefined;
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

class Variable {
  value: string;
  [VARIABLE_PARENT_SYMBOL]: Variable | undefined;
  [VARIABLE_TYPE_SYMBOL]: string;
  constructor(value: string, options: Partial<VariableOptions> = {}) {
    const { type = "string", parent = undefined } = options;

    this[VARIABLE_PARENT_SYMBOL] = parent;
    this[VARIABLE_TYPE_SYMBOL] = type;
    this.value = value;
  }

  get parent() {
    return this[VARIABLE_PARENT_SYMBOL];
  }

  set parent(parent) {
    this[VARIABLE_PARENT_SYMBOL] = parent;
  }

  get type() {
    return this[VARIABLE_TYPE_SYMBOL];
  }

  set type(type) {
    this[VARIABLE_TYPE_SYMBOL] = type;
  }
}

const expressions = [
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
function traverseNode(node: any, inLoop = false) {
  if (node instanceof NodeSymbol) {
    return [new Variable(node.value)];
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
    return parseFuncOrFilter(node, inLoop);
  }
  if (expressions.includes(node.typename)) {
    return parseExpression(node, inLoop);
  }
  if (node instanceof Compare) {
    return parseCompare(node, inLoop);
  }
  return {};
}

function traverse(nodes: any, inLoop = false): any {
  if (!nodes.children) {
    return traverseNode(nodes, inLoop);
  }

  const result = {};
  for (const a of nodes.children) {
    merge(result, traverse(a, inLoop));
  }
}

function parseCompare(node: any, inLoop = false): any {
  if (!(node instanceof Compare)) {
    throw new Error(`current node type is not Compare, it is ${node.typename}`);
  }

  const { expr } = node;

  return traverse(expr, inLoop);
}

function parseFuncOrFilter(node: any, inLoop = false) {
  if (!(node instanceof FunCall) && !(node instanceof Filter)) {
    throw new Error(
      `current node type is not FunCall or Filter, it is ${node.typename}`
    );
  }

  const { args } = node;

  return traverse(args, inLoop);
}

function parseExpression(node: any, inLoop = false) {
  if (!expressions.includes(node.typename)) {
    throw new Error(
      `current node type is not in Expression, it is ${node.typename}`
    );
  }

  const { left, right } = node;

  return merge(traverse(left, inLoop), traverse(right, inLoop));
}

function parseIf(node: any, inLoop = false) {
  if (!(node instanceof If)) {
    throw new Error(
      `current node type is not LookupVal, it is ${node.typename}`
    );
  }

  const { body, cond, else_ } = node;

  return merge(
    traverse(body, inLoop),
    traverse(cond, inLoop),
    else_ ? traverse(else_, inLoop) : {}
  );
}

function parseLookUp(node: any, inLoop = false) {
  if (!(node instanceof LookupVal)) {
    throw new Error(
      `Current node type is not LookupVal, it is ${node.typename}`
    );
  }
  const { target, val } = node;
  if (!(target instanceof NodeSymbol)) {
    throw new Error("Invalid expression, LookupVal target must be a variable!");
  }

  if (target.value === "loop") {
    return {};
  }

  const targetVar = new Variable(target.value, { type: "object" });
  if (val instanceof Literal) {
    return {
      [target.value]: {
        [val.value]: true,
      },
    };
  }

  return [targetVar, ...traverse(val, inLoop)];
}

function parsePair(node: any, inLoop = false) {
  if (!(node instanceof Pair)) {
    throw new Error(`current node type is not Pair, it is ${node.typename}`);
  }

  const { key, value } = node;
  return [...traverse(key, inLoop), ...traverse(value, inLoop)];
}

function parseFor(node: any) {
  if (!(node instanceof For)) {
    throw new Error(`current node type is not For, it is ${node.typename}`);
  }
  let result: any[] = [];
  const { arr, name, body } = node;

  if (arr instanceof NodeSymbol && name instanceof NodeSymbol) {
    const listVar = new Variable(arr.value, { type: "list" });
    const itemVar = new Variable(name.value, { parent: listVar });
    result.push(itemVar, listVar);
  } else {
    result = [...result, ...traverse(arr, true), ...traverse(name, true)];
  }

  let bodyVariable = traverse(body, true);
  const childrenVariable = result.filter(
    (x) => x.parent && x.parent.type === "list"
  );
  if (childrenVariable.length > 0) {
    const finalBodyVar = [];
    for (const bVar of bodyVariable) {
      const { value, parent, type } = bVar;
      const hasItemVar = childrenVariable.find((el) => value === el.value);
      if (hasItemVar) {
        const itemVar = result.find((el) => el.value === value);
        itemVar.type = type;
        continue;
      }

      const hasParentItemVar = childrenVariable.find(
        (x) => parent.value === x.value
      );

      if (hasParentItemVar) {
        bVar.parent = hasParentItemVar;
        finalBodyVar.push(bVar);
        continue;
      }

      finalBodyVar.push(bVar);
    }

    bodyVariable = finalBodyVar;
  }
  result = result.concat(bodyVariable);
  return result;
}

function parseTemplateVariables(tpl: string): Variable[] {
  const nodes = parser.parse(tpl, true);

  return traverse(nodes);
}

export default parseTemplateVariables;
