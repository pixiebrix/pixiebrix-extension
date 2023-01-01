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

import TraceAnalysis from "@/analysis/analysisVisitors/traceAnalysis";
import { serializeError } from "serialize-error";
import { throwIfInvalidInput } from "@/runtime/runtimeUtils";
import { JQTransformer } from "@/blocks/transformers/jq";
import { BusinessError } from "@/errors/businessErrors";

describe("TraceAnalysis.mapErrorAnnotations", () => {
  test("handles invalid field value", async () => {
    let inputError;
    try {
      await throwIfInvalidInput(new JQTransformer(), { filter: 42 } as any);
      expect.fail("Invalid test, expected validateInput to throw");
    } catch (error) {
      inputError = serializeError(error);
    }

    const annotations = new TraceAnalysis([]).mapErrorAnnotations(
      { path: "" },
      inputError
    );

    expect(annotations).toHaveLength(1);
    expect(annotations[0].position).toEqual({ path: "config.filter" });
  });

  test("handles required field value", async () => {
    let inputError;
    try {
      await throwIfInvalidInput(new JQTransformer(), {} as any);
      expect.fail("Invalid test, expected validateInput to throw");
    } catch (error) {
      inputError = serializeError(error);
    }

    const annotations = new TraceAnalysis([]).mapErrorAnnotations(
      { path: "" },
      inputError
    );

    expect(annotations).toHaveLength(1);
    expect(annotations[0].position).toEqual({ path: "config.filter" });
    expect(annotations[0].message).toEqual(
      "Error from the last run: This field is required."
    );
  });

  test("handles non input value", async () => {
    const annotations = new TraceAnalysis([]).mapErrorAnnotations(
      { path: "" },
      serializeError(new BusinessError("foo"))
    );

    expect(annotations).toHaveLength(1);
    expect(annotations[0].position).toEqual({ path: "" });
    expect(annotations[0].message).toEqual("foo");
  });
});
