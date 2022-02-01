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

import blockRegistry from "@/blocks/registry";
import { reducePipeline } from "@/runtime/reducePipeline";
import { deferBlock, simpleInput, testOptions } from "./pipelineTestHelpers";

// Mock the recordX trace methods. Otherwise they'll fail and Jest will have unhandledrejection errors since we call
// them with `void` instead of awaiting them in the reducePipeline methods
import * as logging from "@/background/messenger/api";

(logging.getLoggingConfig as any) = jest.fn().mockResolvedValue({
  logValues: true,
});

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(deferBlock);
});

describe("apiVersion: v3", () => {
  const deferred = {
    __type__: "defer",
    __value__: {
      __type__: "mustache",
      __value__: "{{ @element }} - {{ @input.value }}",
    },
  };

  test("deferBlock renders top-level deferred block", async () => {
    const pipeline = {
      id: deferBlock.id,
      config: {
        array: [1, 2],
        element: deferred,
      },
    };

    const result = await reducePipeline(
      pipeline,
      simpleInput({ value: 42 }),
      testOptions("v3")
    );
    expect(result).toStrictEqual([
      // The deferBlock is set up to look for !defer expression as the top level expression
      "1 - 42",
      "2 - 42",
    ]);
  });

  test("deferBlock only renders top-level deferred block", async () => {
    const pipeline = {
      id: deferBlock.id,
      config: {
        array: [1, 2],
        element: {
          immediate: {
            __type__: "mustache",
            __value__: "{{ @element }} - {{ @input.value }}",
          },
          deferred,
        },
      },
    };

    const result = await reducePipeline(
      pipeline,
      simpleInput({ value: 42 }),
      testOptions("v3")
    );
    expect(result).toStrictEqual([
      // The deferBlock is set up to look for !defer expression as the top level expression
      { immediate: " - 42", deferred },
      { immediate: " - 42", deferred },
    ]);
  });
});
