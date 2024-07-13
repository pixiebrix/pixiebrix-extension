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
} from "@/runtime/extendModVariableContext";
import {
  MergeStrategies,
  setState,
  StateNamespaces,
} from "@/platform/state/stateController";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { type ApiVersion } from "@/types/runtimeTypes";
import { standaloneModComponentRefFactory } from "@/testUtils/factories/modComponentFactories";

describe("createModVariableProxy", () => {
  beforeEach(() => {
    setState({
      namespace: StateNamespaces.MOD,
      data: {},
      modComponentRef: standaloneModComponentRefFactory(),
      mergeStrategy: MergeStrategies.REPLACE,
    });
  });

  it("reads from blank page state", () => {
    const ctxt = extendModVariableContext({} as UnknownObject, {
      modComponentRef: standaloneModComponentRefFactory(),
      options: apiVersionOptions("v3"),
    });
    expect(contextAsPlainObject(ctxt)).toEqual({ "@mod": {} });
  });

  it("reads from page state", () => {
    const modComponentRef = standaloneModComponentRefFactory();

    setState({
      namespace: StateNamespaces.MOD,
      data: { foo: 42 },
      modComponentRef,
      mergeStrategy: MergeStrategies.REPLACE,
    });

    const ctxt = extendModVariableContext(
      {},
      { modComponentRef, options: apiVersionOptions("v3") },
    );

    expect(ctxt["@mod"]!.foo).toBe(42);
  });

  it.each(["v1", "v2"])(
    "doesn't extend for old runtime version: %s",
    (version: ApiVersion) => {
      const modComponentRef = standaloneModComponentRefFactory();

      const ctxt = extendModVariableContext(
        {},
        { modComponentRef, options: apiVersionOptions(version) },
      );

      expect(ctxt["@mod"]).toBeUndefined();
    },
  );

  it("does not overwrite existing state", () => {
    const modComponentRef = standaloneModComponentRefFactory();

    const ctxt = extendModVariableContext(
      { "@mod": "foo" },
      { modComponentRef, options: apiVersionOptions("v3") },
    );
    expect(ctxt["@mod"]).toBe("foo");
  });

  it("sets symbol", () => {
    const modComponentRef = standaloneModComponentRefFactory();

    const ctxt = extendModVariableContext(
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

  it("do not update by default", () => {
    const modComponentRef = standaloneModComponentRefFactory();

    const ctxt1 = extendModVariableContext(
      {},
      { modComponentRef, options: apiVersionOptions("v3") },
    );

    setState({
      namespace: StateNamespaces.MOD,
      data: { foo: 42 },
      modComponentRef: standaloneModComponentRefFactory(),
      mergeStrategy: MergeStrategies.REPLACE,
    });

    const ctxt2 = extendModVariableContext(ctxt1, {
      modComponentRef: standaloneModComponentRefFactory(),
      options: apiVersionOptions("v3"),
    });

    expect(ctxt2).toBe(ctxt1);
  });

  it("update if update flag is set", () => {
    const modComponentRef = standaloneModComponentRefFactory();

    const ctxt1 = extendModVariableContext(
      {},
      { modComponentRef, options: apiVersionOptions("v3") },
    );

    setState({
      namespace: StateNamespaces.MOD,
      data: { foo: 42 },
      modComponentRef,
      mergeStrategy: MergeStrategies.REPLACE,
    });

    const ctxt2 = extendModVariableContext(ctxt1, {
      modComponentRef: standaloneModComponentRefFactory(),
      update: true,
      options: apiVersionOptions("v3"),
    });

    expect(contextAsPlainObject(ctxt2)).toStrictEqual({ "@mod": { foo: 42 } });
  });
});
