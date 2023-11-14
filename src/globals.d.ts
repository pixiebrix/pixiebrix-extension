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

/*
eslint-disable @typescript-eslint/consistent-type-imports --
Import statements turn `globals.d.ts` in a "module definition" file instead of an ambient file.
https://github.com/typescript-eslint/typescript-eslint/issues/3295#issuecomment-1666667362
*/

// We only use this package for its types. URLPattern is Chrome 95+
/// <reference types="urlpattern-polyfill" />

// Improve standard type library https://www.totaltypescript.com/ts-reset
/// <reference types="@total-typescript/ts-reset" />

type Browser = import("webextension-polyfill").Browser;

// https://stackoverflow.com/questions/43638454/webpack-typescript-image-import
declare module "*.svg" {
  const CONTENT: string;
  export default CONTENT;
}

declare module "*.png" {
  const CONTENT: string;
  export default CONTENT;
}

declare module "*?loadAsUrl" {
  const CONTENT: string;
  export default CONTENT;
}

declare module "*?loadAsText" {
  const CONTENT: string;
  export default CONTENT;
}

// Loading svg as React component using @svgr
declare module "*.svg?loadAsComponent" {
  import type React from "react";

  const SVG: React.FC<React.SVGProps<SVGSVGElement>>;
  export default SVG;
}

declare module "*.txt" {
  const CONTENT: string;
  export default CONTENT;
}

declare module "*.yaml" {
  const CONTENT: Record<string, unknown>;
  export default CONTENT;
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
  import { type UnknownObject } from "@/types/objectTypes";

  const json: (title: string, obj: unknown) => UnknownObject;
}

// No types available
declare module "@pixiebrix/jq-web";
declare module "canvas-confetti";

// From https://github.com/mozilla/page-metadata-parser/issues/116#issuecomment-614882830
declare module "page-metadata-parser" {
  export type IPageMetadata = Record<string, string | string[]>;

  export type PageMetadataRule = [
    string,
    (element: HTMLElement) => string | null
  ];

  export function getMetadata(
    doc: Document | HTMLElement,
    url: string,
    customRuleSets?: Record<string, PageMetadataRule>
  ): IPageMetadata;
}

declare module "@/vendors/initialize" {
  import { type JsonValue, type Promisable } from "type-fest";

  /** Attach a MutationObserver specifically for a selector */
  const initialize: (
    selector: string,
    callback: (
      this: Element,
      index: number,
      element: Element
    ) => Promisable<void | false>,
    options: { target: Element | Document; observer?: MutationObserverInit }
  ) => MutationObserver;

  export default initialize;
}

interface JQuery {
  /**
   * From @/vendors/hoverintent
   * @param options
   */
  hoverIntent: (options: {
    /**
     * Required. The handlerIn function you'd like to call on "mouseenter with intent". Your function receives the same
     * "this" and "event" objects as it would from jQuery's hover method. If the "over" function is sent alone (without
     * "out") then it will be used in both cases like the handlerInOut param.
     */
    over: JQuery.EventHandler<unknown>;
    /**
     * The handlerOut function you'd like to call on "mouseleave after timeout". Your function receives the same "this"
     * and "event" objects as it would from jQuery's hover method. Note, hoverIntent will only call the "out" function
     * if the "over" function has been called.
     */
    out?: JQuery.EventHandler<unknown>;
    /**
     * A simple delay, in milliseconds, before the "out" function is called. If the user mouses back over the element
     * before the timeout has expired the "out" function will not be called (nor will the "over" function be called).
     * This is primarily to protect against sloppy/human mousing trajectories that temporarily (and unintentionally)
     * take the user off of the target element... giving them time to return. Default timeout: 0
     */
    timeout?: number;
    /**
     * A selector string for event delegation. Used to filter the descendants of the selected elements that trigger the
     * event. If the selector is null or omitted, the event is always triggered when it reaches the selected element
     */
    selector?: string;
  }) => void;
}

interface JQueryStatic {
  find: (() => JQuery) & {
    /** Partial type for `$.find.tokenize */
    tokenize: (selector: string) => string[];
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
    onrejected?:
      | ((reason: unknown) => TResult | PromiseLike<TResult>)
      | undefined
      | null
  ): Promise<T | TResult>;
}

interface ErrorOptions {
  cause?: unknown;
}

interface Error {
  cause?: unknown;
}

interface ErrorConstructor {
  new (message?: string, options?: ErrorOptions): Error;
  (message?: string, options?: ErrorOptions): Error;
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
    reviver?: (this: unknown, key: string, value: unknown) => unknown
  ): import("type-fest").JsonValue;
}

// TODO: This overrides Firefox’ types. It's possible that the return types are different between Firefox and Chrome
interface ExtendedRuntime
  extends Omit<Browser["runtime"], "requestUpdateCheck"> {
  /*
   * Requests an update check for this app/extension.
   */
  requestUpdateCheck(): Promise<chrome.runtime.RequestUpdateCheckStatus>;
}

// Temporary type until officially added
type BrowserStorage = Browser["storage"];
interface ExtendedStorage extends BrowserStorage {
  session: Browser.storage.local;
}

// @ts-expect-error See Firefox/requestUpdateCheck-related comment above
interface ChromeifiedBrowser extends Browser {
  runtime: ExtendedRuntime;
  storage: ExtendedStorage;
}

declare const browser: ChromeifiedBrowser;

declare namespace CSS {
  function px(length: number): string;
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
}
