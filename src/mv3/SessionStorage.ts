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

/**
 * @file Store data in a Map with fallback to storage.session, if present.
 * The alternative would be to use `chrome.storage.local` as a polyfill, but
 * then we'd have to manually keep track of this data and clean it up,
 * potentially leaving data behind.
 */

import { expectContext } from "@/utils/expectContext";
import { type OmitIndexSignature, type JsonValue } from "type-fest";
import { type ManualStorageKey } from "@/utils/storageUtils";
import { once } from "lodash";
import pMemoize from "p-memoize";

// Just like chrome.storage.session, this must be "global"
// eslint-disable-next-line local-rules/persistBackgroundData -- MV2-only
const storage = new Map<ManualStorageKey, JsonValue>();

// eslint-disable-next-line local-rules/persistBackgroundData -- Static
const hasSession = "session" in chrome.storage;
function validateContext(): void {
  expectContext(
    "background",
    "This polyfill doesn’t share data across contexts; only use it in the background page",
  );
}

/**
 * MV3-compatible Map-like storage, this helps transition to chrome.storage.session
 * and provide some type safety.
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

  async has(secondaryKey: string): Promise<boolean> {
    this.validateContext();
    const rawStorageKey = this.getRawStorageKey(secondaryKey);
    if (!hasSession) {
      return storage.has(rawStorageKey);
    }

    const result = await browser.storage.session.get(rawStorageKey);
    return rawStorageKey in result;
  }

  async get(secondaryKey: string): Promise<Value | undefined> {
    this.validateContext();
    const rawStorageKey = this.getRawStorageKey(secondaryKey);
    if (!hasSession) {
      return storage.get(rawStorageKey) as Value | undefined;
    }

    const result = await browser.storage.session.get(rawStorageKey);
    // eslint-disable-next-line security/detect-object-injection -- `getRawStorageKey` ensures the format
    return result[rawStorageKey] as Value | undefined;
  }

  async set(secondaryKey: string, value: Value): Promise<void> {
    this.validateContext();

    const rawStorageKey = this.getRawStorageKey(secondaryKey);
    if (hasSession) {
      await browser.storage.session.set({ [rawStorageKey]: value });
    } else {
      storage.set(rawStorageKey, value);
    }
  }

  async delete(secondaryKey: string): Promise<void> {
    this.validateContext();

    const rawStorageKey = this.getRawStorageKey(secondaryKey);
    if (hasSession) {
      await browser.storage.session.remove(rawStorageKey);
    } else {
      storage.delete(rawStorageKey);
    }
  }
}

/**
 * MV3-compatible single-value storage.
 * This helps transition to chrome.storage.session and provide some type safety.
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
  pMemoize(fn, {
    // `fn` has no arguments, so only one value is stored
    cache: new SessionMap(key, url),
  });
