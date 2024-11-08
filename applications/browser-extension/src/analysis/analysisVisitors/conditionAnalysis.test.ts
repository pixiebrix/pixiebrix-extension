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

import { triggerFormStateFactory } from "../../testUtils/factories/pageEditorFactories";
import { ContextBrick } from "../../runtime/pipelineTests/testHelpers";
import { validateOutputKey } from "../../runtime/runtimeTypes";
import { AnnotationType } from "../../types/annotationTypes";
import ConditionAnalysis from "./conditionAnalysis";
import { toExpression } from "../../utils/expressionUtils";
import { AnalysisAnnotationActionType } from "../analysisTypes";
import IfElse from "@/bricks/transformers/controlFlow/IfElse";

describe("conditionAnalysis", () => {
  describe("brick condition", () => {
    it("no warning for unset field", async () => {
      const formState = triggerFormStateFactory({}, [
        {
          id: ContextBrick.BRICK_ID,
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
          id: ContextBrick.BRICK_ID,
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
          id: ContextBrick.BRICK_ID,
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
          id: ContextBrick.BRICK_ID,
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

  describe("if-else condition", () => {
    it("warns for exclude", async () => {
      const formState = triggerFormStateFactory({}, [
        {
          id: IfElse.BRICK_ID,
          config: {},
          outputKey: validateOutputKey("foo"),
        },
      ]);

      const analysis = new ConditionAnalysis();
      analysis.run(formState);

      expect(analysis.getAnnotations()).toStrictEqual([
        expect.objectContaining({
          type: AnnotationType.Warning,
        }),
      ]);
    });

    it.each(["y", "f"])("warns for template literal", async (value) => {
      const formState = triggerFormStateFactory({}, [
        {
          id: IfElse.BRICK_ID,
          config: {
            condition: value,
          },
          outputKey: validateOutputKey("foo"),
        },
      ]);

      const analysis = new ConditionAnalysis();
      analysis.run(formState);

      expect(analysis.getAnnotations()).toStrictEqual([
        expect.objectContaining({
          type: AnnotationType.Warning,
        }),
      ]);
    });

    it("allows expression", async () => {
      const formState = triggerFormStateFactory({}, [
        {
          id: IfElse.BRICK_ID,
          config: {
            condition: toExpression("nunjucks", "{{ true if @input.foo }}"),
          },
          outputKey: validateOutputKey("foo"),
        },
      ]);

      const analysis = new ConditionAnalysis();
      analysis.run(formState);

      expect(analysis.getAnnotations()).toStrictEqual([]);
    });

    it.each([true, false])("warns for boolean literal", async (value) => {
      const formState = triggerFormStateFactory({}, [
        {
          id: IfElse.BRICK_ID,
          config: {
            condition: value,
          },
          outputKey: validateOutputKey("foo"),
        },
      ]);

      const analysis = new ConditionAnalysis();
      analysis.run(formState);

      expect(analysis.getAnnotations()).toStrictEqual([
        expect.objectContaining({
          type: AnnotationType.Warning,
        }),
      ]);
    });
  });

  it.each(["t", "f", ""])(
    "warns for constant template expression",
    async (value) => {
      const formState = triggerFormStateFactory({}, [
        {
          id: IfElse.BRICK_ID,
          config: {
            condition: toExpression("nunjucks", value),
          },
          outputKey: validateOutputKey("foo"),
        },
      ]);

      const analysis = new ConditionAnalysis();
      analysis.run(formState);

      expect(analysis.getAnnotations()).toStrictEqual([
        expect.objectContaining({
          type: AnnotationType.Warning,
        }),
      ]);
    },
  );
});
