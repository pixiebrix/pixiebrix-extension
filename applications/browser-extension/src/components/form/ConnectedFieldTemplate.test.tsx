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

import React from "react";
import { render, screen } from "../../pageEditor/testHelpers";
import ConnectedFieldTemplate from "./ConnectedFieldTemplate";
import { formStateFactory } from "../../testUtils/factories/pageEditorFactories";
import {
  brickConfigFactory,
  pipelineFactory,
} from "../../testUtils/factories/brickFactories";
import type { AnalysisAnnotation } from "@/analysis/analysisTypes";
import { AnnotationType } from "../../types/annotationTypes";
import { actions } from "../../pageEditor/store/editor/editorSlice";
import analysisSlice from "@/analysis/analysisSlice";
import { toExpression } from "../../utils/expressionUtils";
import AnalysisAnnotationsContext from "@/analysis/AnalysisAnnotationsContext";
import { selectActiveModComponentAnalysisAnnotationsForPath } from "../../pageEditor/store/editor/editorSelectors";

describe("ConnectedFieldTemplate", () => {
  it("shows formik error only when touched", async () => {
    render(<ConnectedFieldTemplate name="testField" label="Test Field" />, {
      initialValues: {
        testField: "test value",
      },
      initialErrors: {
        testField: "test error",
      },
    });

    await expect(screen.findByText("Test Field")).resolves.toBeInTheDocument();
    expect(screen.queryByText("test error")).not.toBeInTheDocument();

    screen.getByLabelText("Test Field").focus();
    screen.getByLabelText("Test Field").blur();

    await expect(screen.findByText("test error")).resolves.toBeInTheDocument();
  });

  it("shows formik error with showUntouchedErrors", async () => {
    render(
      <ConnectedFieldTemplate
        name="testField"
        label="Test Field"
        showUntouchedErrors
      />,
      {
        initialValues: {
          testField: "test value",
        },
        initialErrors: {
          testField: "test error",
        },
      },
    );

    await expect(screen.findByText("Test Field")).resolves.toBeInTheDocument();
    expect(screen.getByText("test error")).toBeInTheDocument();
  });

  describe("page editor analysis context", () => {
    const renderInContext: typeof render = (element, options) =>
      render(
        <AnalysisAnnotationsContext.Provider
          value={{
            analysisAnnotationsSelectorForPath:
              selectActiveModComponentAnalysisAnnotationsForPath,
          }}
        >
          {element}
        </AnalysisAnnotationsContext.Provider>,
        options,
      );

    it("shows analysis error", async () => {
      const formState = formStateFactory({
        brickPipeline: pipelineFactory(
          brickConfigFactory({
            config: {
              testField: "test value",
            },
          }),
        ),
      });

      const path = "modComponent.brickPipeline[0].config.testField";

      const analysisAnnotation: AnalysisAnnotation = {
        analysisId: "test",
        type: AnnotationType.Error,
        message: "test analysis error annotation",
        position: {
          path,
        },
        detail: "test value",
      };

      renderInContext(
        <ConnectedFieldTemplate name={path} label="Test Field" />,
        {
          initialValues: formState,
          setupRedux(dispatch) {
            dispatch(actions.addModComponentFormState(formState));
            dispatch(
              analysisSlice.actions.finishAnalysis({
                modComponentId: formState.uuid,
                analysisId: "test",
                annotations: [analysisAnnotation],
              }),
            );
          },
        },
      );

      await expect(
        screen.findByText("Test Field"),
      ).resolves.toBeInTheDocument();
      expect(
        screen.getByText("test analysis error annotation"),
      ).toBeInTheDocument();
    });

    it("shows both formik and analysis error", async () => {
      const formState = formStateFactory({
        brickPipeline: pipelineFactory(
          brickConfigFactory({
            config: {
              testField: "test value",
            },
          }),
        ),
      });

      const path = "modComponent.brickPipeline[0].config.testField";

      const analysisAnnotation: AnalysisAnnotation = {
        analysisId: "test",
        type: AnnotationType.Error,
        message: "test analysis error annotation",
        position: {
          path,
        },
        detail: "test value",
      };

      renderInContext(
        <ConnectedFieldTemplate
          name={path}
          label="Test Field"
          showUntouchedErrors
        />,
        {
          initialValues: formState,
          initialErrors: {
            modComponent: {
              brickPipeline: [
                {
                  config: {
                    testField: "test formik error",
                  },
                },
              ],
            },
          },
          setupRedux(dispatch) {
            dispatch(actions.addModComponentFormState(formState));
            dispatch(
              analysisSlice.actions.finishAnalysis({
                modComponentId: formState.uuid,
                analysisId: "test",
                annotations: [analysisAnnotation],
              }),
            );
          },
        },
      );

      await expect(
        screen.findByText("Test Field"),
      ).resolves.toBeInTheDocument();
      expect(screen.getByText("test formik error")).toBeInTheDocument();
      expect(
        screen.getByText("test analysis error annotation"),
      ).toBeInTheDocument();
    });

    it("shows multiple analysis errors", async () => {
      const formState = formStateFactory({
        brickPipeline: pipelineFactory(
          brickConfigFactory({
            config: {
              testField: "test value",
            },
          }),
        ),
      });

      const path = "modComponent.brickPipeline[0].config.testField";

      const analysisAnnotation1: AnalysisAnnotation = {
        analysisId: "test1",
        type: AnnotationType.Error,
        message: "test analysis error annotation 1",
        position: {
          path,
        },
        detail: "test value",
      };

      const analysisAnnotation2: AnalysisAnnotation = {
        analysisId: "test2",
        type: AnnotationType.Error,
        message: "test analysis error annotation 2",
        position: {
          path,
        },
        detail: "test value",
      };

      renderInContext(
        <ConnectedFieldTemplate name={path} label="Test Field" />,
        {
          initialValues: formState,
          setupRedux(dispatch) {
            dispatch(actions.addModComponentFormState(formState));
            dispatch(
              analysisSlice.actions.finishAnalysis({
                modComponentId: formState.uuid,
                analysisId: "test1",
                annotations: [analysisAnnotation1],
              }),
            );
            dispatch(
              analysisSlice.actions.finishAnalysis({
                modComponentId: formState.uuid,
                analysisId: "test2",
                annotations: [analysisAnnotation2],
              }),
            );
          },
        },
      );

      await expect(
        screen.findByText("Test Field"),
      ).resolves.toBeInTheDocument();
      expect(
        screen.getByText("test analysis error annotation 1"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("test analysis error annotation 2"),
      ).toBeInTheDocument();
    });

    it("does not show analysis error annotation when the annotation detail does not match the field value", async () => {
      const formState = formStateFactory({
        brickPipeline: pipelineFactory(
          brickConfigFactory({
            config: {
              testField: toExpression("var", "@mod."),
            },
          }),
        ),
      });

      const path = "modComponent.brickPipeline[0].config.testField";

      const annotations: AnalysisAnnotation[] = [
        // The annotation appears normally when detail matches the field value
        {
          analysisId: "test",
          type: AnnotationType.Error,
          message: "Matching detail value",
          position: {
            path,
          },
          detail: toExpression("var", "@mod."),
        },
        // The annotation should appear when there is no detail
        {
          analysisId: "test",
          type: AnnotationType.Error,
          message: "No detail value",
          position: {
            path,
          },
        },
        // The annotation should appear if detail.expression matches the field value
        {
          analysisId: "test",
          type: AnnotationType.Error,
          message: "Matching expression detail value",
          position: {
            path,
          },
          detail: { expression: toExpression("var", "@mod.") },
        },
        // The annotation does not appear when the detail has a value that does not match the field value
        {
          analysisId: "test",
          type: AnnotationType.Error,
          message: "Detail value does not match",
          position: {
            path,
          },
          detail: toExpression("var", "@foo"),
        },
        {
          analysisId: "test",
          type: AnnotationType.Error,
          message: "Non-matching expression detail value",
          position: {
            path,
          },
          detail: { expression: toExpression("var", "@foo") },
        },
      ];

      renderInContext(
        <ConnectedFieldTemplate name={path} label="Test Field" />,
        {
          initialValues: formState,
          setupRedux(dispatch) {
            dispatch(actions.addModComponentFormState(formState));
            dispatch(
              analysisSlice.actions.finishAnalysis({
                modComponentId: formState.uuid,
                analysisId: "test",
                annotations,
              }),
            );
          },
        },
      );

      await expect(
        screen.findByText("Test Field"),
      ).resolves.toBeInTheDocument();
      expect(screen.getByText("Matching detail value")).toBeInTheDocument();
      expect(screen.getByText("No detail value")).toBeInTheDocument();
      expect(
        screen.getByText("Matching expression detail value"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Detail value does not match"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Non-matching expression detail value"),
      ).not.toBeInTheDocument();
    });
  });
});
