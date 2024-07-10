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

import brickRegistry from "@/bricks/registry";
import { reducePipeline } from "@/runtime/reducePipeline";
import { deferBrick, simpleInput, testOptions } from "./pipelineTestHelpers";
import { toExpression } from "@/utils/expressionUtils";

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([deferBrick]);
});

describe("apiVersion: v3", () => {
  const deferred = toExpression(
    "defer",
    toExpression("mustache", "{{ @element }} - {{ @input.value }}"),
  );

  test("deferBrick renders top-level deferred block", async () => {
    const pipeline = {
      id: deferBrick.id,
      config: {
        array: [1, 2],
        element: deferred,
      },
    };

    const result = await reducePipeline(
      pipeline,
      simpleInput({ value: 42 }),
      testOptions("v3"),
    );
    expect(result).toStrictEqual([
      // The deferBrick is set up to look for !defer expression as the top level expression
      "1 - 42",
      "2 - 42",
    ]);
  });

  test("deferBrick only renders top-level deferred block", async () => {
    const pipeline = {
      id: deferBrick.id,
      config: {
        array: [1, 2],
        element: {
          immediate: toExpression(
            "mustache",
            "{{ @element }} - {{ @input.value }}",
          ),
          deferred,
        },
      },
    };

    const result = await reducePipeline(
      pipeline,
      simpleInput({ value: 42 }),
      testOptions("v3"),
    );
    expect(result).toStrictEqual([
      // The deferBrick is set up to look for !defer expression as the top level expression
      { immediate: " - 42", deferred },
      { immediate: " - 42", deferred },
    ]);
  });
});
