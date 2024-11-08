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

import { expectContext } from "../utils/expectContext";
import { type OmitIndexSignature, type JsonValue } from "type-fest";
import { type ManualStorageKey } from "../utils/storageUtils";
import { once } from "lodash";
import pMemoize from "p-memoize";

function validateContext(): void {
  expectContext(
    "background",
    "This polyfill doesn’t share data across contexts; only use it in the background page",
  );
}

/**
 * Wrapper for chrome.storage.session with added type safety.
 */
export class SessionMap<Value extends JsonValue> {
  constructor(
    private readonly key: string,
    private readonly url: ImportMeta["url"],
  ) {}

  // Do not call `expectContext` in the constructor so that `SessionMap` can be
  // instantiated at the top level and still be imported (but unused) in other contexts.
  private readonly validateContext = once(validateContext);

  private getRawStorageKey(secondaryKey: string): ManualStorageKey {
    return `${this.key}::${this.url}::${secondaryKey}` as ManualStorageKey;
  }

  /**
   * Currently only used by tests, but provides a consistent API
   * @internal
   */
  async has(secondaryKey: string): Promise<boolean> {
    this.validateContext();
    const rawStorageKey = this.getRawStorageKey(secondaryKey);

    const result = await browser.storage.session.get(rawStorageKey);
    // OK to check for undefined because it's not a valid JsonValue. The `set` method calls `delete` if
    // the caller tries to set `undefined`.
    // eslint-disable-next-line security/detect-object-injection -- `getRawStorageKey` ensures the format
    return result[rawStorageKey] !== undefined;
  }

  async get(secondaryKey: string): Promise<Value | undefined> {
    this.validateContext();
    const rawStorageKey = this.getRawStorageKey(secondaryKey);

    const result = await browser.storage.session.get(rawStorageKey);

    // eslint-disable-next-line security/detect-object-injection -- `getRawStorageKey` ensures the format
    return result[rawStorageKey] as Value | undefined;
  }

  async set(secondaryKey: string, value: Value): Promise<void> {
    this.validateContext();

    // `undefined` is invalid because it's not a JsonValue. Because Typescript doesn't enforce null vs. undefined
    // in files without strict null checks, check for it here and delete
    if (value === undefined) {
      await this.delete(secondaryKey);
      return;
    }

    const rawStorageKey = this.getRawStorageKey(secondaryKey);
    await browser.storage.session.set({ [rawStorageKey]: value });
  }

  async delete(secondaryKey: string): Promise<void> {
    this.validateContext();

    const rawStorageKey = this.getRawStorageKey(secondaryKey);
    await browser.storage.session.remove(rawStorageKey);
  }
}

/**
 * Single-value storage leveraging chrome.storage.session.
 * Adds some additional type safety.
 */
// "OmitIndexSignature" is because of https://github.com/sindresorhus/type-fest/issues/815
export class SessionValue<Value extends OmitIndexSignature<JsonValue>> {
  private readonly map: SessionMap<Value>;

  constructor(key: string, url: ImportMeta["url"]) {
    this.map = new SessionMap(key, url);
  }

  async get(): Promise<Value | undefined> {
    return this.map.get("#value");
  }

  /** @internal */
  async unset(): Promise<void> {
    await this.map.delete("#value");
  }

  async set(value: Value): Promise<void> {
    await this.map.set("#value", value);
  }
}

/**
 * Helper to run a method at most once per session from the background page.
 * @param key the SessionMap key
 * @param url the ImportMeta.url of the file
 * @param fn the function to run once per session
 */
export const oncePerSession = (
  key: string,
  url: string,
  fn: () => Promise<unknown>,
) =>
  pMemoize(
    async () => {
      await fn();
      // SessionMap expects a JsonValue
      return true;
    },
    {
      // `fn` has no arguments, so only one value is stored
      cache: new SessionMap(key, url),
    },
  );
