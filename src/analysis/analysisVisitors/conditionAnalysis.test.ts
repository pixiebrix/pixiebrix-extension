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
import { ContextBrick } from "@/runtime/pipelineTests/pipelineTestHelpers";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { AnnotationType } from "@/types/annotationTypes";
import ConditionAnalysis from "@/analysis/analysisVisitors/conditionAnalysis";
import { toExpression } from "@/utils/expressionUtils";
import { AnalysisAnnotationActionType } from "@/analysis/analysisTypes";

describe("conditionAnalysis", () => {
  it("no warning for unset field", async () => {
    const formState = triggerFormStateFactory({}, [
      {
        id: ContextBrick.BLOCK_ID,
        config: {},
        outputKey: validateOutputKey("foo"),
      },
    ]);

    const analysis = new ConditionAnalysis();
    analysis.run(formState);

    expect(analysis.getAnnotations()).toEqual([]);
  });

  it("warning for blank value", async () => {
    const formState = triggerFormStateFactory({}, [
      {
        id: ContextBrick.BLOCK_ID,
        config: {},
        if: toExpression("nunjucks", " "),
        outputKey: validateOutputKey("foo"),
      },
    ]);

    const analysis = new ConditionAnalysis();
    analysis.run(formState);

    expect(analysis.getAnnotations()).toStrictEqual([
      expect.objectContaining({
        type: AnnotationType.Warning,
        actions: [
          expect.objectContaining({
            caption: "Exclude Condition",
            type: AnalysisAnnotationActionType.UnsetValue,
            path: "modComponent.brickPipeline.0.if",
          }),
        ],
      }),
    ]);
  });

  it.each([true, false])("info for boolean literal", async (value) => {
    const formState = triggerFormStateFactory({}, [
      {
        id: ContextBrick.BLOCK_ID,
        config: {},
        if: value,
        outputKey: validateOutputKey("foo"),
      },
    ]);

    const analysis = new ConditionAnalysis();
    analysis.run(formState);

    expect(analysis.getAnnotations()).toStrictEqual([
      expect.objectContaining({
        type: AnnotationType.Info,
      }),
    ]);
  });

  it.each(["y", "f"])("info for template literal", async (value) => {
    const formState = triggerFormStateFactory({}, [
      {
        id: ContextBrick.BLOCK_ID,
        config: {},
        if: toExpression("nunjucks", value),
        outputKey: validateOutputKey("foo"),
      },
    ]);

    const analysis = new ConditionAnalysis();
    analysis.run(formState);

    expect(analysis.getAnnotations()).toStrictEqual([
      expect.objectContaining({
        type: AnnotationType.Info,
      }),
    ]);
  });
});
