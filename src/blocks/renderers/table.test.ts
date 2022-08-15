/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { TableRenderer } from "./table";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { neverPromise } from "@/testUtils/testHelpers";

describe("parse compile error", () => {
  test("null data", async () => {
    const result = await new TableRenderer().render(
      unsafeAssumeValidArg({
        data: null,
        columns: [{ label: "label", property: "property" }],
      }),
      {
        ctxt: {},
        root: null,
        logger: new ConsoleLogger(),
        runPipeline: neverPromise,
      }
    );

    expect(result).toMatchSnapshot();
  });

  test("table with data", async () => {
    const result = await new TableRenderer().render(
      unsafeAssumeValidArg({
        data: [{ property: "Foo" }],
        columns: [{ label: "label", property: "property" }],
      }),
      {
        ctxt: {},
        root: null,
        logger: new ConsoleLogger(),
        runPipeline: neverPromise,
      }
    );

    expect(result).toMatchSnapshot();
  });
});
