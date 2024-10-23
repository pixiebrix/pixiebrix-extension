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

import { triggerFormStateFactory } from "@/testUtils/factories/pageEditorFactories";

import OutputKeyAnalysis from "@/analysis/analysisVisitors/outputKeyAnalysis";
import { ContextBrick } from "@/runtime/pipelineTests/testHelpers";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { AnnotationType } from "@/types/annotationTypes";

describe("outputKeyAnalysis", () => {
  it("no warning", async () => {
    const formState = triggerFormStateFactory({}, [
      {
        id: ContextBrick.BRICK_ID,
        config: {},
        outputKey: validateOutputKey("foo"),
      },
    ]);

    const analysis = new OutputKeyAnalysis();
    await analysis.run(formState);

    expect(analysis.getAnnotations()).toEqual([]);
  });

  it.each(["input", "options", "mod"])("reserved name: %s", async (name) => {
    const formState = triggerFormStateFactory({}, [
      // Syntactically it's a valid output key
      {
        id: ContextBrick.BRICK_ID,
        config: {},
        outputKey: validateOutputKey(name),
      },
    ]);

    const analysis = new OutputKeyAnalysis();
    await analysis.run(formState);

    expect(analysis.getAnnotations()).toEqual([
      expect.objectContaining({
        type: AnnotationType.Warning,
      }),
    ]);
  });
});
