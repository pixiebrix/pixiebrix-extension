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

import ConsoleLogger from "@/utils/ConsoleLogger";
import { validateRegistryId } from "@/types/helpers";
import { type BrickOptions } from "@/types/runtimeTypes";
import AssignModVariable from "@/blocks/effects/assignModVariable";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { getPageState, setPageState } from "@/contentScript/pageState";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";

const extensionId = autoUUIDSequence();
const blueprintId = validateRegistryId("test/123");

beforeEach(() => {
  setPageState({
    namespace: "blueprint",
    blueprintId,
    extensionId,
    mergeStrategy: "replace",
    data: {},
  });
});

describe("@pixiebrix/state/assign", () => {
  test("replaces value", async () => {
    const logger = new ConsoleLogger({
      extensionId,
      blueprintId,
    });

    const brick = new AssignModVariable();

    await brick.run(
      unsafeAssumeValidArg({ variableName: "foo", value: { foo: 42 } }),
      { logger } as BrickOptions
    );
    await brick.run(
      unsafeAssumeValidArg({ variableName: "foo", value: { bar: 42 } }),
      { logger } as BrickOptions
    );

    expect(
      getPageState({ namespace: "blueprint", blueprintId, extensionId })
    ).toEqual({ foo: { bar: 42 } });
  });

  test("only sets variable", async () => {
    const logger = new ConsoleLogger({
      extensionId,
      blueprintId,
    });

    const brick = new AssignModVariable();

    await brick.run(unsafeAssumeValidArg({ variableName: "foo", value: 42 }), {
      logger,
    } as BrickOptions);
    await brick.run(unsafeAssumeValidArg({ variableName: "bar", value: 0 }), {
      logger,
    } as BrickOptions);

    expect(
      getPageState({ namespace: "blueprint", blueprintId, extensionId })
    ).toEqual({ foo: 42, bar: 0 });
  });
});
