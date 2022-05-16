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

import React from "react";
import {
  render,
  RenderOptions,
  RenderResult,
  screen,
} from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { Provider } from "react-redux";
import {
  Action,
  AnyAction,
  CombinedState,
  configureStore,
  PreloadedState,
  Reducer,
  ReducersMapObject,
} from "@reduxjs/toolkit";
import { Form, Formik, FormikValues } from "formik";
import { Dispatch } from "redux";
import { authSlice } from "@/auth/authSlice";
import extensionsSlice from "@/store/extensionsSlice";
import servicesSlice from "@/store/servicesSlice";
import settingsSlice from "@/store/settingsSlice";
import { editorSlice } from "@/pageEditor/slices/editorSlice";
import sessionSlice from "@/pageEditor/slices/sessionSlice";
import { savingExtensionSlice } from "@/pageEditor/panes/save/savingExtensionSlice";
import runtimeSlice from "@/pageEditor/slices/runtimeSlice";
import { logSlice } from "@/components/logViewer/logSlice";
import userEvent from "@testing-library/user-event";
import { Expression, ExpressionType } from "@/core";
import { noop } from "lodash";

export const waitForEffect = async () =>
  act(async () => {
    // Awaiting the async state update
  });

// NoInfer is internal type of @reduxjs/toolkit tsHelpers
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the type copied from @reduxjs/toolkit typings
declare type NoInfer<T> = [T][T extends any ? 0 : never];
export type CreateRenderFunctionOptions<
  TState,
  TAction extends Action,
  TProps
> = {
  reducer: Reducer<TState, TAction> | ReducersMapObject<TState, TAction>;
  preloadedState?: PreloadedState<CombinedState<NoInfer<TState>>>;

  ComponentUnderTest: React.ComponentType<TProps>;
  defaultProps?: TProps;
};

export function createRenderFunction<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the type copied from Redux typings
  S = any,
  A extends Action = AnyAction,
  // eslint-disable-next-line @typescript-eslint/ban-types -- the type copied from Redux typings
  P = {}
>({
  reducer,
  preloadedState,
  ComponentUnderTest,
  defaultProps,
}: CreateRenderFunctionOptions<S, A, P>) {
  return (overrides?: {
    propsOverride?: Partial<P>;
    stateOverride?: Partial<S>;
  }) => {
    const store = configureStore({
      reducer,
      preloadedState: {
        ...preloadedState,
        ...overrides?.stateOverride,
      },
    });

    const props = {
      ...defaultProps,
      ...overrides?.propsOverride,
    };

    return render(
      <Provider store={store}>
        <ComponentUnderTest {...props} />
      </Provider>
    );
  };
}

type SetupRedux = (dispatch: Dispatch) => void;

type WrapperOptions = Omit<RenderOptions, "wrapper"> & {
  initialValues?: FormikValues;
  setupRedux?: SetupRedux;
};

type WrapperResult = RenderResult & {
  getFormState: () => Promise<FormikValues>;
};

function renderWithWrappers(
  ui: React.ReactElement,
  {
    initialValues = {},
    setupRedux = noop,
    ...renderOptions
  }: WrapperOptions = {}
): WrapperResult {
  let submitHandler: (values: FormikValues) => void = jest.fn();

  const Wrapper: React.FC = ({ children }) => {
    const store = configureStore({
      reducer: {
        auth: authSlice.reducer,
        options: extensionsSlice.reducer,
        services: servicesSlice.reducer,
        settings: settingsSlice.reducer,
        editor: editorSlice.reducer,
        session: sessionSlice.reducer,
        savingExtension: savingExtensionSlice.reducer,
        runtime: runtimeSlice.reducer,
        logs: logSlice.reducer,
      },
    });

    setupRedux(store.dispatch);

    return (
      <Provider store={store}>
        <Formik
          initialValues={initialValues}
          onSubmit={(values) => {
            submitHandler?.(values);
          }}
        >
          {({ handleSubmit }) => (
            <Form onSubmit={handleSubmit}>
              {children}
              <button type="submit">Submit</button>
            </Form>
          )}
        </Formik>
      </Provider>
    );
  };

  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    ...renderResult,
    async getFormState() {
      // Wire-up a handler to grab the form state
      let formState: FormikValues = null;
      submitHandler = (values) => {
        formState = values;
      };

      // Submit the form
      await userEvent.click(screen.getByRole("button", { name: /submit/i }));

      return formState;
    },
  };
}

// eslint-disable-next-line import/export -- re-export RTL
export * from "@testing-library/react";
// eslint-disable-next-line import/export -- override render
export { renderWithWrappers as render };

export function toExpression<T>(type: ExpressionType, value: T): Expression<T> {
  return {
    __type__: type,
    __value__: value,
  };
}
