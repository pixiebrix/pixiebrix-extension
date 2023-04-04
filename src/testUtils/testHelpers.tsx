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
import {
  render,
  type RenderOptions,
  type RenderResult,
  screen,
} from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { Provider } from "react-redux";
import {
  type Action,
  type AnyAction,
  type CombinedState,
  configureStore,
  type EnhancedStore,
  type PreloadedState,
  type Reducer,
  type ReducersMapObject,
  type ThunkDispatch,
} from "@reduxjs/toolkit";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Form, Formik, type FormikErrors, type FormikValues } from "formik";
import { type Middleware } from "redux";
import userEvent from "@testing-library/user-event";
import { type Expression, type ExpressionType } from "@/core";
import { noop } from "lodash";
import { type ThunkMiddlewareFor } from "@reduxjs/toolkit/dist/getDefaultMiddleware";
import { type UnknownObject } from "@/types";
import { type PipelineExpression } from "@/runtime/mapArgs";
import { type BlockPipeline } from "@/blocks/types";
import {
  renderHook,
  act as actHook,
  type RenderHookOptions,
  type RenderHookResult,
} from "@testing-library/react-hooks";

export const neverPromise = async (...args: unknown[]): Promise<never> => {
  console.error("This method should not have been called", { args });
  throw new Error("This method should not have been called");
};

/**
 * Generate mocked listeners for browser.*.onEvent objects
 * @example browser.permissions.onAdded = getChromeEventMocks();
 */
export const getChromeEventMocks = () => ({
  addListener: jest.fn(),
  removeListener: jest.fn(),
  hasListener: jest.fn(),
  hasListeners: jest.fn(),
});

/**
 * Wait for async handlers, e.g., useAsyncEffect and useAsyncState.
 *
 * NOTE: this assumes you're using "react-dom/test-utils". For hooks you have to use act from
 * "@testing-library/react-hooks"
 */
export const waitForEffect = async () =>
  act(async () => {
    // Awaiting the async state update
  });

/**
 * Runs pending jest timers within the "act" wrapper
 */
export const runPendingTimers = async () =>
  act(async () => {
    jest.runOnlyPendingTimers();
  });

// NoInfer is internal type of @reduxjs/toolkit tsHelpers
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the type copied from @reduxjs/toolkit typings
declare type NoInfer<T> = [T][T extends any ? 0 : never];
type CreateRenderFunctionOptions<TState, TAction extends Action, TProps> = {
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

type SetupRedux = (
  dispatch: ThunkDispatch<unknown, unknown, AnyAction>,
  extra: {
    store: EnhancedStore;
  }
) => void;

type WrapperOptions = Omit<RenderOptions, "wrapper"> & {
  initialValues?: FormikValues;
  initialErrors?: FormikErrors<FormikValues>;
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
    {
      initialValues,
      initialErrors,
      setupRedux = noop,
      ...renderOptions
    }: WrapperOptions = {}
  ): WrapperResult => {
    let submitHandler: (values: FormikValues) => void = jest.fn();

    const store = configureStore();

    setupRedux(store.dispatch, { store });

    const Wrapper: React.FC = initialValues
      ? ({ children }) => (
          <Provider store={store}>
            <Formik
              initialValues={initialValues}
              initialErrors={initialErrors}
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

type HookWrapperOptions<TProps> = Omit<RenderHookOptions<TProps>, "wrapper"> & {
  initialValues?: FormikValues;
  setupRedux?: SetupRedux;
};

type HookWrapperResult<
  TProps,
  TResult,
  S = UnknownObject,
  A extends Action = AnyAction,
  M extends ReadonlyArray<Middleware<UnknownObject, S>> = [
    ThunkMiddlewareFor<S>
  ]
> = RenderHookResult<TProps, TResult> & {
  getReduxStore: () => EnhancedStore<S, A, M>;

  /**
   * The act function which should be used with the renderHook
   */
  act: (callback: () => Promise<void>) => Promise<undefined>;

  /**
   * Await all async side effects
   */
  waitForEffect: () => Promise<void>;

  getFormState: () => Promise<FormikValues>;
};

export function createRenderHookWithWrappers(configureStore: ConfigureStore) {
  return <TProps, TResult>(
    hook: (props: TProps) => TResult,
    {
      initialValues,
      setupRedux = noop,
      ...renderOptions
    }: HookWrapperOptions<TProps> = {}
  ): HookWrapperResult<TProps, TResult> => {
    let submitHandler: (values: FormikValues) => void = jest.fn();

    const store = configureStore();

    setupRedux(store.dispatch, { store });

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

    const renderResult = renderHook(hook, {
      wrapper: Wrapper,
      ...renderOptions,
    });

    return {
      ...renderResult,
      getReduxStore() {
        return store;
      },
      act: actHook,
      async waitForEffect() {
        await actHook(async () => {
          // Awaiting the async state update
        });
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
