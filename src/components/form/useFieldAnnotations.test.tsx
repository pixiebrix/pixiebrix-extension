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

import React from "react";
import { useFormErrorSettings } from "@/components/form/FormErrorContext";
import {
  renderHook,
  type WrapperComponent,
} from "@testing-library/react-hooks";
// eslint-disable-next-line no-restricted-imports -- Needed for this test
import { Formik } from "formik";
import useFieldAnnotations from "@/components/form/useFieldAnnotations";
import { AnnotationType } from "@/types/annotationTypes";
import { configureStore } from "@reduxjs/toolkit";
import {
  actions,
  editorSlice,
  initialState as editorInitialState,
} from "@/pageEditor/slices/editorSlice";
import analysisSlice from "@/analysis/analysisSlice";
import { type EditorRootState } from "@/pageEditor/pageEditorTypes";
import {
  type AnalysisAnnotation,
  type AnalysisRootState,
} from "@/analysis/analysisTypes";
import { uuidv4 } from "@/types/helpers";
import { Provider } from "react-redux";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import {
  blockConfigFactory,
  pipelineFactory,
} from "@/testUtils/factories/blockFactories";

jest.mock("@/components/form/FormErrorContext", () => ({
  useFormErrorSettings: jest.fn(),
}));

const useFormErrorSettingsMock = useFormErrorSettings as jest.MockedFunction<
  typeof useFormErrorSettings
>;

describe("useFieldAnnotations", () => {
  test("shows formik error annotation", () => {
    useFormErrorSettingsMock.mockReturnValue({
      shouldUseAnalysis: false,
      showUntouchedErrors: true, // Show untouched errors, so we don't have to mark the field touched for a test
      showFieldActions: true, // Formik errors won't have actions though
    });

    const initialValues = {
      testField: "test value",
    };

    const wrapper: WrapperComponent<any> = ({ children }) => (
      <Formik
        initialValues={initialValues}
        initialErrors={{ testField: "test error" }}
        onSubmit={jest.fn()}
      >
        {children}
      </Formik>
    );
    const annotations = renderHook(() => useFieldAnnotations("testField"), {
      wrapper,
    }).result.current;
    expect(annotations).toHaveLength(1);
    expect(annotations[0].type).toEqual(AnnotationType.Error);
    expect(annotations[0].message).toEqual("test error");
  });

  test("shows analysis error annotation", () => {
    useFormErrorSettingsMock.mockReturnValue({
      shouldUseAnalysis: true,
      showUntouchedErrors: true, // Show untouched errors, so we don't have to mark the field touched for a test
      showFieldActions: true,
    });

    const element = formStateFactory(
      undefined,
      pipelineFactory(
        blockConfigFactory({
          config: {
            testField: "test value",
          },
        })
      )
    );

    const path = "extension.blockPipeline[0].config.testField";

    const analysisAnnotation: AnalysisAnnotation = {
      analysisId: uuidv4(),
      type: AnnotationType.Error,
      message: "test error annotation",
      position: {
        path,
      },
    };

    const preloadedState: EditorRootState & AnalysisRootState = {
      editor: editorInitialState,
      analysis: {
        extensionAnnotations: {
          [element.uuid]: [analysisAnnotation],
        },
        knownVars: {},
      },
    };

    const store = configureStore({
      reducer: {
        editor: editorSlice.reducer,
        analysis: analysisSlice.reducer,
      },
      preloadedState,
    });

    store.dispatch(actions.selectInstalled(element));

    const wrapper: WrapperComponent<any> = ({ children }) => (
      <Provider store={store}>
        <Formik initialValues={element} onSubmit={jest.fn()}>
          {children}
        </Formik>
      </Provider>
    );

    const annotations = renderHook(() => useFieldAnnotations(path), { wrapper })
      .result.current;
    expect(annotations).toHaveLength(1);
    expect(annotations[0].type).toEqual(AnnotationType.Error);
    expect(annotations[0].message).toEqual("test error annotation");
  });
});
