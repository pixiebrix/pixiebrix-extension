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

import extendModVariableContext, {
  contextAsPlainObject,
  isModVariableContext,
} from "./extendModVariableContext";
import apiVersionOptions from "./apiVersionOptions";
import { type ApiVersion } from "@/types/runtimeTypes";
import { modComponentRefFactory } from "../testUtils/factories/modComponentFactories";
import { MergeStrategies, StateNamespaces } from "../platform/state/stateTypes";
import { getPlatform } from "../platform/platformContext";

describe("createModVariableProxy", () => {
  beforeEach(async () => {
    await getPlatform().state.setState({
      namespace: StateNamespaces.MOD,
      data: {},
      modComponentRef: modComponentRefFactory(),
      mergeStrategy: MergeStrategies.REPLACE,
    });
  });

  it("reads from blank page state", async () => {
    const ctxt = await extendModVariableContext({} as UnknownObject, {
      modComponentRef: modComponentRefFactory(),
      options: apiVersionOptions("v3"),
    });
    expect(contextAsPlainObject(ctxt)).toEqual({ "@mod": {} });
  });

  it("reads from page state", async () => {
    const modComponentRef = modComponentRefFactory();

    await getPlatform().state.setState({
      namespace: StateNamespaces.MOD,
      data: { foo: 42 },
      modComponentRef,
      mergeStrategy: MergeStrategies.REPLACE,
    });

    const ctxt = await extendModVariableContext(
      {},
      { modComponentRef, options: apiVersionOptions("v3") },
    );

    expect(ctxt["@mod"]!.foo).toBe(42);
  });

  it.each(["v1", "v2"])(
    "doesn't extend for old runtime version: %s",
    async (version: ApiVersion) => {
      const modComponentRef = modComponentRefFactory();

      const ctxt = await extendModVariableContext(
        {},
        { modComponentRef, options: apiVersionOptions(version) },
      );

      expect(ctxt["@mod"]).toBeUndefined();
    },
  );

  it("does not overwrite existing state", async () => {
    const modComponentRef = modComponentRefFactory();

    const ctxt = await extendModVariableContext(
      { "@mod": "foo" },
      { modComponentRef, options: apiVersionOptions("v3") },
    );
    expect(ctxt["@mod"]).toBe("foo");
  });

  it("sets symbol", async () => {
    const modComponentRef = modComponentRefFactory();

    const ctxt = await extendModVariableContext(
      {},
      { modComponentRef, options: apiVersionOptions("v3") },
    );
    expect(isModVariableContext(ctxt)).toBe(true);
    // The symbol shouldn't show up when enumerating properties. (We don't want it to show up in the UI)
    expect(Object.keys(ctxt)).toEqual(["@mod"]);
  });

  it("non-extended context", () => {
    expect(isModVariableContext({})).toBe(false);
  });

  it("do not update by default", async () => {
    const modComponentRef = modComponentRefFactory();

    const ctxt1 = await extendModVariableContext(
      {},
      { modComponentRef, options: apiVersionOptions("v3") },
    );

    await getPlatform().state.setState({
      namespace: StateNamespaces.MOD,
      data: { foo: 42 },
      modComponentRef: modComponentRefFactory(),
      mergeStrategy: MergeStrategies.REPLACE,
    });

    const ctxt2 = await extendModVariableContext(ctxt1, {
      modComponentRef: modComponentRefFactory(),
      options: apiVersionOptions("v3"),
    });

    expect(ctxt2).toBe(ctxt1);
  });

  it("update if update flag is set", async () => {
    const modComponentRef = modComponentRefFactory();

    const ctxt1 = await extendModVariableContext(
      {},
      { modComponentRef, options: apiVersionOptions("v3") },
    );

    await getPlatform().state.setState({
      namespace: StateNamespaces.MOD,
      data: { foo: 42 },
      modComponentRef,
      mergeStrategy: MergeStrategies.REPLACE,
    });

    const ctxt2 = await extendModVariableContext(ctxt1, {
      modComponentRef: modComponentRefFactory({ modId: modComponentRef.modId }),
      update: true,
      options: apiVersionOptions("v3"),
    });

    expect(contextAsPlainObject(ctxt2)).toStrictEqual({ "@mod": { foo: 42 } });
  });
});
