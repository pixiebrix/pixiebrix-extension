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

import React, { StrictMode } from "react";
import {
  render,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { Provider } from "react-redux";
import {
  type Action,
  type AnyAction,
  type EnhancedStore,
  type Middleware,
  type ThunkDispatch,
} from "@reduxjs/toolkit";
import {
  // eslint-disable-next-line no-restricted-imports -- need the originals
  Form,
  // eslint-disable-next-line no-restricted-imports -- need the originals
  Formik,
  type FormikErrors,
  type FormikHelpers,
  type FormikValues,
} from "formik";
import { noop } from "lodash";
import { type ThunkMiddlewareFor } from "@reduxjs/toolkit/dist/getDefaultMiddleware";
import {
  act as actHook,
  renderHook,
  type RenderHookOptions,
  type RenderHookResult,
  type WrapperComponent,
} from "@testing-library/react-hooks";

/**
 * Wait for async handlers, e.g., useAsyncEffect and useAsyncState.
 *
 * NOTE: this assumes you're using "react-dom/test-utils". For hooks, you have to use act from
 * "@testing-library/react-hooks"
 *
 */
export const waitForEffect = async () =>
  // eslint-disable-next-line testing-library/no-unnecessary-act -- hack for testing some asynchronous code that the standard utilities have proven inadequate
  act(async () => {
    // Awaiting the async state update
  });

type SetupRedux = (
  dispatch: ThunkDispatch<unknown, unknown, AnyAction>,
  extra: {
    store: EnhancedStore;
  },
) => void;

type WrapperOptions = RenderOptions & {
  initialValues?: FormikValues;
  initialErrors?: FormikErrors<FormikValues>;
  setupRedux?: SetupRedux;
  onSubmit?: (
    values: FormikValues,
    formikHelpers: FormikHelpers<FormikValues>,
  ) => void | Promise<unknown>;
};

type WrapperResult<
  S = UnknownObject,
  A extends Action = AnyAction,
  M extends ReadonlyArray<Middleware<UnknownObject, S>> = [
    ThunkMiddlewareFor<S>,
  ],
> = RenderResult & {
  getReduxStore(): EnhancedStore<S, A, M>;

  /**
   * Get the current form values
   */
  getFormState(): FormikValues | null;

  /**
   * Update the formik state without interacting with the UI
   * @param newValues the new FormikValues to override the current form state
   * @param shouldValidate whether or not to run validation on the new values
   */
  updateFormState(
    newValues: React.SetStateAction<FormikValues>,
    shouldValidate?: boolean,
  ): void;
};

type ConfigureStore<
  S = UnknownObject,
  A extends Action = AnyAction,
> = () => EnhancedStore<S, A>;

export function createRenderWithWrappers(configureStore: ConfigureStore) {
  return (
    ui: React.ReactElement,
    {
      initialValues,
      initialErrors,
      setupRedux = noop,
      onSubmit = jest.fn(),
      wrapper,
      ...renderOptions
    }: WrapperOptions = {},
  ): WrapperResult => {
    const store = configureStore();

    setupRedux(store.dispatch, { store });

    let formValues: FormikValues | null = null;

    let updateFormState: (
      newValues: React.SetStateAction<FormikValues>,
      shouldValidate?: boolean,
    ) => void = noop;

    const ExtraWrapper = wrapper ?? (({ children }) => <>{children}</>);

    const Wrapper: React.FC<{ children: React.ReactElement }> = initialValues
      ? ({ children }) => (
          <StrictMode>
            <Provider store={store}>
              <Formik
                initialValues={initialValues}
                initialErrors={initialErrors}
                // Don't validate, we don't pass in a validation schema here
                validateOnMount={false}
                validateOnChange={false}
                validateOnBlur={false}
                onSubmit={onSubmit}
              >
                {({ handleSubmit, values, setValues }) => {
                  formValues = values;
                  updateFormState = setValues;
                  return (
                    <Form onSubmit={handleSubmit}>
                      <ExtraWrapper>{children}</ExtraWrapper>
                      <button type="submit">Submit</button>
                    </Form>
                  );
                }}
              </Formik>
            </Provider>
          </StrictMode>
        )
      : ({ children }) => (
          <StrictMode>
            <Provider store={store}>
              <ExtraWrapper>{children}</ExtraWrapper>
            </Provider>
          </StrictMode>
        );

    const utils = render(ui, { wrapper: Wrapper, ...renderOptions });

    return {
      ...utils,
      getReduxStore() {
        return store;
      },
      getFormState() {
        return formValues;
      },
      updateFormState,
    };
  };
}

type HookWrapperOptions<TProps> = RenderHookOptions<TProps> & {
  /**
   * Initial Formik values.
   */
  initialValues?: FormikValues;
  /**
   * Callback to setup Redux state by dispatching actions.
   */
  setupRedux?: SetupRedux;
};

type HookWrapperResult<
  TProps,
  TResult,
  S = UnknownObject,
  A extends Action = AnyAction,
  M extends ReadonlyArray<Middleware<UnknownObject, S>> = [
    ThunkMiddlewareFor<S>,
  ],
> = RenderHookResult<TProps, TResult> & {
  getReduxStore(): EnhancedStore<S, A, M>;

  /**
   * Await all async side effects
   */
  waitForEffect(): Promise<void>;

  /**
   * Get the current form values
   */
  getFormState(): FormikValues | null;
};

export function createRenderHookWithWrappers(configureStore: ConfigureStore) {
  return <TProps, TResult>(
    hook: (props: TProps) => TResult,
    {
      initialValues,
      setupRedux = noop,
      wrapper,
      ...renderOptions
    }: HookWrapperOptions<TProps> = {},
  ): HookWrapperResult<TProps, TResult> => {
    const store = configureStore();

    setupRedux(store.dispatch, { store });

    let formValues: FormikValues | null = null;

    const ExtraWrapper: WrapperComponent<TProps> =
      wrapper ?? (({ children }) => <>{children}</>);

    const Wrapper: WrapperComponent<TProps> = initialValues
      ? (props) => (
          <StrictMode>
            <Provider store={store}>
              <Formik initialValues={initialValues} onSubmit={jest.fn()}>
                {({ handleSubmit, values }) => {
                  formValues = values;
                  return (
                    <Form onSubmit={handleSubmit}>
                      <ExtraWrapper {...props} />
                      <button type="submit">Submit</button>
                    </Form>
                  );
                }}
              </Formik>
            </Provider>
          </StrictMode>
        )
      : (props) => (
          <StrictMode>
            <Provider store={store}>
              <ExtraWrapper {...props} />
            </Provider>
          </StrictMode>
        );

    const utils = renderHook(hook, {
      wrapper: Wrapper,
      ...renderOptions,
    });

    return {
      ...utils,
      getReduxStore() {
        return store;
      },
      async waitForEffect() {
        await actHook(async () => {
          // Awaiting the async state update
        });
      },
      getFormState() {
        return formValues;
      },
    };
  };
}
