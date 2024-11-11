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
  getState,
  TEST_resetStateController,
} from "@/contentScript/stateController/stateController";
import { modComponentRefFactory } from "@/testUtils/factories/modComponentFactories";
import {
  MergeStrategies,
  STATE_CHANGE_JS_EVENT_TYPE,
  StateNamespaces,
} from "@/platform/state/stateTypes";
import type { JSONSchema7Definition } from "json-schema";
import { registerModVariables } from "@/contentScript/stateController/modVariablePolicyController";
import { getSessionStorageKey } from "@/platform/state/stateHelpers";
import { getThisFrame } from "webext-messenger";

beforeEach(async () => {
  await TEST_resetStateController();
});

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

    it("segregates tab/session storage", async () => {
      const { tabId } = await getThisFrame();
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
            sessionVariable: {
              type: "string",
              "x-sync-policy": "session",
              // Cast required because types don't support custom `x-` variables yet
            } as JSONSchema7Definition,
            tabVariable: {
              type: "string",
              "x-sync-policy": "tab",
              // Cast required because types don't support custom `x-` variables yet
            } as JSONSchema7Definition,
          },
        },
      });

      await setState({
        namespace: StateNamespaces.MOD,
        data: { sessionVariable: "sessionValue", quox: 42 },
        mergeStrategy: MergeStrategies.REPLACE,
        modComponentRef,
      });

      // The storage fake doesn't emit events
      expect(listener).toHaveBeenCalledTimes(0);

      let values = await browser.storage.session.get(null);

      // Ensure values are segmented correctly in storage
      expect(values).toStrictEqual({
        [getSessionStorageKey({ modId: modComponentRef.modId, tabId })]: {},
        [getSessionStorageKey({ modId: modComponentRef.modId })]: {
          sessionVariable: "sessionValue",
        },
      });

      await setState({
        namespace: StateNamespaces.MOD,
        data: { tabVariable: "tabValue" },
        mergeStrategy: MergeStrategies.SHALLOW,
        modComponentRef,
      });

      values = await browser.storage.session.get(null);

      expect(values).toStrictEqual({
        [getSessionStorageKey({ modId: modComponentRef.modId })]: {
          sessionVariable: "sessionValue",
        },
        [getSessionStorageKey({ modId: modComponentRef.modId, tabId })]: {
          tabVariable: "tabValue",
        },
      });
    });
  });
});
