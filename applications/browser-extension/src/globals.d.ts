/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

/*
eslint-disable @typescript-eslint/consistent-type-imports --
Import statements turn `globals.d.ts` in a "module definition" file instead of an ambient file.
https://github.com/typescript-eslint/typescript-eslint/issues/3295#issuecomment-1666667362
*/

// We only use this package for its types. URLPattern is Chrome 95+
// See https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1199
/// <reference types="urlpattern-polyfill" />

// Improve standard type library https://www.totaltypescript.com/ts-reset
/// <reference types="@total-typescript/ts-reset" />

/// <reference types="jest-extended" />

declare const browser: import("webextension-polyfill").Browser;

/* eslint-disable-next-line no-restricted-syntax --
 * Type to be preferred over a plain `object`
 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/ban-types.md */
type UnknownObject = Record<string, unknown>;

// https://stackoverflow.com/questions/43638454/webpack-typescript-image-import
declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*?loadAsUrl" {
  const content: string;
  export default content;
}

declare module "*?loadAsText" {
  const content: string;
  export default content;
}

// Loading svg as React component using @svgr
declare module "*.svg?loadAsComponent" {
  import type React from "react";

  const svg: React.FC<React.SVGProps<SVGSVGElement>>;
  export default svg;
}

declare module "*.txt" {
  const content: string;
  export default content;
}

declare module "*.yaml" {
  const content: UnknownObject;
  export default content;
}

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
declare module "*.module.scss" {
  const classes: Record<string, string>;
  export default classes;
}

// Package has no types: https://github.com/guiyep/react-select-virtualized/issues/293
declare module "react-select-virtualized" {
  export { default } from "react-select";
}

declare module "generate-schema" {
  const json: (title: string, obj: unknown) => UnknownObject;
}

// No types available
declare module "@pixiebrix/jq-web" {
  const jq: {
    promised: {
      json: (input: JsonValue, filter: string) => Promise<JsonValue>;
    };
  };
  export default jq;
}
declare module "canvas-confetti" {
  const confetti: (options: Record<unknown, unknown>) => void;
  export default confetti;
}

type Token = {
  value: string;
  type: "PSEUDO" | "TAG" | string;
  matches: string[];
};

interface JQueryStatic {
  find: (() => JQuery) & {
    /** Partial type for `$.find.tokenize */
    tokenize: (selector: string) => Token[][];
  };
}

// `useUnknownInCatchVariables` for .catch method https://github.com/microsoft/TypeScript/issues/45602
interface Promise<T> {
  /**
   * Attaches a callback for only the rejection of the Promise.
   * @param onrejected The callback to execute when the Promise is rejected.
   * @returns A Promise for the completion of the callback.
   */
  catch<TResult = never>(
    onrejected?: // eslint-disable-next-line local-rules/preferNullishable -- Importing here is not worth it
    ((reason: unknown) => TResult | PromiseLike<TResult>) | undefined | null,
  ): Promise<T | TResult>;
}

// This changes the return value from `any` to `JsonValue`.
// "total-typescript" sets it to `unknown` but `JsonValue` is more useful and accurate.
interface JSON {
  /**
   * Converts a JavaScript Object Notation (JSON) string into an object.
   * @param text A valid JSON string.
   * @param reviver A function that transforms the results. This function is called for each member of the object.
   * If a member contains nested objects, the nested objects are transformed before the parent object is.
   */
  parse(
    text: string,
    reviver?: (this: unknown, key: string, value: unknown) => unknown,
  ): import("type-fest").JsonValue;
}

// These types are unnecessarily loose
// https://dom.spec.whatwg.org/#dom-node-textcontent
interface ChildNode {
  textContent: string;
}
interface Text {
  textContent: string;
}
interface Element {
  textContent: string;

  /** https://caniuse.com/scrollintoviewifneeded */
  scrollIntoViewIfNeeded: (centerIfNeeded?: boolean) => void;
}
