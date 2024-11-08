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

import {
  getSessionStorageKey,
  tryParseSessionStorageKey,
} from "./stateHelpers";
import { modComponentRefFactory } from "../../testUtils/factories/modComponentFactories";

describe("tryParseSessionStorageKey", () => {
  it("round trips a key", () => {
    const { modId } = modComponentRefFactory();
    const key = getSessionStorageKey({ modId, tabId: 123 });
    expect(tryParseSessionStorageKey(key)).toStrictEqual({ modId, tabId: 123 });
  });

  it("returns undefined for invalid key", () => {
    const { modId } = modComponentRefFactory();
    const invalidKey = getSessionStorageKey({ modId, tabId: 123 }) + "!!!";
    expect(tryParseSessionStorageKey(invalidKey)).toBeUndefined();
  });
});
