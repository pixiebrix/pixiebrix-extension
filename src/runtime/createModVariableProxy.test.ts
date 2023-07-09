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

import createModVariableProxy, {
  isModVariableContext,
} from "@/runtime/createModVariableProxy";
import { setPageState } from "@/contentScript/pageState";
import { mapArgs } from "@/runtime/mapArgs";
import { makeVariableExpression } from "@/runtime/expressionCreators";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";
import { type UnknownObject } from "@/types/objectTypes";

describe("createModVariableProxy", () => {
  beforeEach(() => {
    setPageState({
      namespace: "blueprint",
      data: {},
      extensionId: autoUUIDSequence(),
      blueprintId: null,
      mergeStrategy: "replace",
    });
  });

  it("reads from blank page state", () => {
    const ctxt = createModVariableProxy({} as UnknownObject, {
      blueprintId: null,
    });
    expect(ctxt["@mod"]).toEqual({});
  });

  it("reads from page state", () => {
    const ctxt = createModVariableProxy({}, { blueprintId: null });

    setPageState({
      namespace: "blueprint",
      data: { foo: 42 },
      extensionId: autoUUIDSequence(),
      blueprintId: null,
      mergeStrategy: "replace",
    });

    expect((ctxt as any)["@mod"].foo).toEqual(42);
  });

  it("does not overwrite existing state", () => {
    const ctxt = createModVariableProxy(
      { "@mod": "foo" },
      { blueprintId: null }
    );
    expect(ctxt["@mod"]).toEqual("foo");
  });

  it("sets symbol", () => {
    const ctxt = createModVariableProxy({}, { blueprintId: null });
    expect(isModVariableContext(ctxt)).toBe(true);
    expect(isModVariableContext({})).toBe(false);
  });

  it("adds property as own property", () => {
    const ctxt = createModVariableProxy({}, { blueprintId: null });
    expect(Object.hasOwn(ctxt, "@mod")).toBe(true);
    // Only appears if explicitly requested
    expect(Object.keys(ctxt)).not.toContain("@mod");
  });

  it("works with map args with variable renderer", async () => {
    const ctxt = createModVariableProxy({}, { blueprintId: null });

    setPageState({
      namespace: "blueprint",
      data: { foo: 42 },
      extensionId: autoUUIDSequence(),
      blueprintId: null,
      mergeStrategy: "replace",
    });

    const result = await mapArgs(
      { foo: makeVariableExpression("@mod.foo") },
      ctxt,
      {
        implicitRender: null,
        autoescape: false,
      }
    );

    expect((result as UnknownObject).foo).toEqual(42);
  });

  it("do not throw on nested proxy", () => {
    const ctxt1 = createModVariableProxy({}, { blueprintId: null });
    const ctxt2 = createModVariableProxy(ctxt1, { blueprintId: null });
    expect(ctxt2).toBe(ctxt1);
  });
});
