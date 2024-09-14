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
  setState,
  registerModVariables,
  getState,
} from "@/contentScript/stateController";
import { modComponentRefFactory } from "@/testUtils/factories/modComponentFactories";
import {
  MergeStrategies,
  STATE_CHANGE_JS_EVENT_TYPE,
  StateNamespaces,
} from "@/platform/state/stateTypes";
import type { JSONSchema7Definition } from "json-schema";

describe("pageState", () => {
  it("deep merge triggers event", async () => {
    const listener = jest.fn();

    document.addEventListener(STATE_CHANGE_JS_EVENT_TYPE, listener);

    const modComponentRef = modComponentRefFactory();

    await setState({
      namespace: StateNamespaces.MOD,
      data: { foo: { bar: "baz" } },
      mergeStrategy: MergeStrategies.DEEP,
      modComponentRef,
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("deep merges async state", async () => {
    const listener = jest.fn();

    document.addEventListener(STATE_CHANGE_JS_EVENT_TYPE, listener);

    const modComponentRef = modComponentRefFactory();

    await setState({
      namespace: StateNamespaces.MOD,
      data: {
        asyncState: { isFetching: false, data: "foo", currentData: "foo" },
      },
      mergeStrategy: MergeStrategies.DEEP,
      modComponentRef,
    });

    const updatedState = await setState({
      namespace: StateNamespaces.MOD,
      data: { asyncState: { isFetching: true, currentData: null } },
      mergeStrategy: MergeStrategies.DEEP,
      modComponentRef,
    });

    expect(listener).toHaveBeenCalledTimes(2);

    expect(updatedState).toEqual({
      asyncState: { isFetching: true, currentData: null, data: "foo" },
    });
  });

  describe("mod variable policy", () => {
    it("stores variable in session storage", async () => {
      const listener = jest.fn();

      document.addEventListener(STATE_CHANGE_JS_EVENT_TYPE, listener);

      const modComponentRef = modComponentRefFactory();

      await expect(browser.storage.session.get(null)).resolves.toStrictEqual(
        {},
      );

      registerModVariables(modComponentRef.modId, {
        schema: {
          type: "object",
          properties: {
            foo: {
              type: "object",
              "x-sync-policy": "session",
              // Cast required because types don't support custom `x-` variables yet
            } as JSONSchema7Definition,
          },
          required: ["foo"],
        },
      });

      await setState({
        namespace: StateNamespaces.MOD,
        data: { foo: { bar: "baz" }, quox: 42 },
        mergeStrategy: MergeStrategies.REPLACE,
        modComponentRef,
      });

      // The storage fake doesn't emit events
      expect(listener).toHaveBeenCalledTimes(0);

      const values = await browser.storage.session.get(null);

      // Ensure values are segmented correctly in storage
      expect(JSON.stringify(values)).not.toContain("quox");
      expect(JSON.stringify(values)).toContain("bar");

      const state = await getState({
        namespace: StateNamespaces.MOD,
        modComponentRef,
      });

      expect(state).toEqual({ foo: { bar: "baz" }, quox: 42 });
    });
  });
});
