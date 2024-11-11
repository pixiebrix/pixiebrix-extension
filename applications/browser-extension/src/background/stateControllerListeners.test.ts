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

import { modComponentRefFactory } from "@/testUtils/factories/modComponentFactories";
import {
  getState,
  setState,
  TEST_resetStateController,
} from "@/contentScript/stateController/stateController";
import { MergeStrategies, StateNamespaces } from "@/platform/state/stateTypes";
import type { JSONSchema7Definition } from "json-schema";
import {
  deleteSynchronizedModVariablesForMod,
  deleteSynchronizedModVariablesForTab,
} from "@/background/stateControllerListeners";
import { getThisFrame } from "webext-messenger";
import { registerModVariables } from "@/contentScript/stateController/modVariablePolicyController";

beforeEach(async () => {
  await TEST_resetStateController();
});

describe("stateControllerListeners", () => {
  it("deletes mod variables", async () => {
    const modComponentRef = modComponentRefFactory();

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
      data: {
        sessionVariable: "sessionValue",
        tabVariable: "tabValue",
      },
      mergeStrategy: MergeStrategies.DEEP,
      modComponentRef,
    });

    let values = await browser.storage.session.get();
    expect(Object.keys(values)).toHaveLength(2);

    // Delete unrelated mod variables
    await deleteSynchronizedModVariablesForMod(modComponentRefFactory().modId);
    values = await browser.storage.session.get();
    expect(Object.keys(values)).toHaveLength(2);

    // Delete mod variables
    await deleteSynchronizedModVariablesForMod(modComponentRef.modId);
    values = await browser.storage.session.get();
    expect(Object.keys(values)).toHaveLength(0);
  });

  it("deletes tab variables", async () => {
    const modComponentRef = modComponentRefFactory();

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
      data: {
        sessionVariable: "sessionValue",
        tabVariable: "tabValue",
      },
      mergeStrategy: MergeStrategies.DEEP,
      modComponentRef,
    });

    let values = await browser.storage.session.get();
    expect(Object.keys(values)).toHaveLength(2);

    // Delete unrelated mod variables
    const { tabId } = await getThisFrame();
    await deleteSynchronizedModVariablesForTab(tabId);

    // Smoke test for raw state
    values = await browser.storage.session.get();
    expect(Object.keys(values)).toHaveLength(1);

    // State controller value check
    const state = await getState({
      namespace: StateNamespaces.MOD,
      modComponentRef,
    });

    expect(state).toStrictEqual({
      sessionVariable: "sessionValue",
    });
  });
});
