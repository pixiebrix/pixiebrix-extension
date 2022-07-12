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
  EnhancedStore,
  PreloadedState,
  Reducer,
  ReducersMapObject,
} from "@reduxjs/toolkit";
import { Form, Formik, FormikValues } from "formik";
import { Dispatch, Middleware } from "redux";
import userEvent from "@testing-library/user-event";
import { Expression, ExpressionType } from "@/core";
import { noop } from "lodash";
import { ThunkMiddlewareFor } from "@reduxjs/toolkit/dist/getDefaultMiddleware";
import { UnknownObject } from "@/types";
import { PipelineExpression } from "@/runtime/mapArgs";
import { BlockPipeline } from "@/blocks/types";

export const neverPromise = async (...args: unknown[]): Promise<never> => {
  console.error("This method should not have been called", { args });
  throw new Error("This method should not have been called");
};

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

export type RenderFunctionWithRedux<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the type copied from Redux typings
  S = any,
  // eslint-disable-next-line @typescript-eslint/ban-types -- the type copied from Redux typings
  P = {}
> = (overrides?: {
  propsOverride?: Partial<P>;
  stateOverride?: Partial<S>;
}) => RenderResult;

/**
 * @deprecated Prefer using `createRenderWithWrappers` instead
 */
export function createRenderFunctionWithRedux<
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
}: CreateRenderFunctionOptions<S, A, P>): RenderFunctionWithRedux<S, P> {
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

type WrapperResult<
  S = UnknownObject,
  A extends Action = AnyAction,
  M extends ReadonlyArray<Middleware<UnknownObject, S>> = [
    ThunkMiddlewareFor<S>
  ]
> = RenderResult & {
  getReduxStore: () => EnhancedStore<S, A, M>;
  getFormState: () => Promise<FormikValues>;
};

type ConfigureStore<
  S = UnknownObject,
  A extends Action = AnyAction
> = () => EnhancedStore<S, A>;

export function createRenderWithWrappers(configureStore: ConfigureStore) {
  return (
    ui: React.ReactElement,
    { initialValues, setupRedux = noop, ...renderOptions }: WrapperOptions = {}
  ): WrapperResult => {
    let submitHandler: (values: FormikValues) => void = jest.fn();

    const store = configureStore();

    setupRedux(store.dispatch);

    const Wrapper: React.FC = initialValues
      ? ({ children }) => (
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
        )
      : ({ children }) => <Provider store={store}>{children}</Provider>;

    const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions });

    return {
      ...renderResult,
      getReduxStore() {
        return store;
      },
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
  };
}

export function toExpression<
  TTemplateOrPipeline,
  TTypeTag extends ExpressionType
>(
  type: TTypeTag,
  value: TTemplateOrPipeline
): Expression<TTemplateOrPipeline, TTypeTag> {
  return {
    __type__: type,
    __value__: value,
  };
}

export const EMPTY_PIPELINE: PipelineExpression = Object.freeze(
  toExpression("pipeline", [] as BlockPipeline)
);
