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

export interface Visitor {
  visit: (node: Node | Element) => boolean;
}

export interface RootInstanceVisitor<T> extends Visitor {
  readonly rootInstances: T[];
}

/**
 * DOM walk helper.
 */
export function walk(node: Node | Element, visitor: Visitor): void {
  // Adapted from: https://github.com/vuejs/vue-devtools/blob/6d8fee4d058716fe72825c9ae22cf831ef8f5172/packages/app-backend/src/index.js#L198
  // Could alternatively use TreeWalker similar to https://github.com/johnmichel/Library-Detector-for-Chrome/

  if (node.childNodes) {
    for (let i = 0, l = node.childNodes.length; i < l; i++) {
      const child = node.childNodes[i];
      const stop = visitor.visit(child);
      if (!stop) {
        walk(child, visitor);
      }
    }
  }

  // Also walk shadow DOM
  if (node instanceof Element && node.shadowRoot) {
    walk(node.shadowRoot, visitor);
  }
}

/**
 * Scan the page for root level instances.
 */
export function scan<T>(visitor: RootInstanceVisitor<T>): T[] {
  walk(document, visitor);
  return visitor.rootInstances;
}
