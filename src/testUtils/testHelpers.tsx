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

import React, { StrictMode, act } from "react";
import {
  render,
  renderHook,
  waitFor,
  type RenderHookOptions,
  type RenderHookResult,
  type RenderOptions,
  type RenderResult,
  type waitForOptions,
} from "@testing-library/react";
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

/**
 * Wait for async handlers, e.g., useAsyncEffect and useAsyncState.
 * @deprecated prefer using `act` directly or `waitFor` directly
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

// https://github.com/testing-library/react-hooks-testing-library/blob/chore/migration-guide/MIGRATION_GUIDE.md#waitfornextupdate
async function waitForValueToChange<T>(getValue: () => T | Promise<T>) {
  const original = getValue();

  await waitFor(async () => {
    await expect(original).resolves.not.toBe(await getValue());
  });
}

type HookWrapperResult<
  TProps,
  TResult,
  S = UnknownObject,
  A extends Action = AnyAction,
  M extends ReadonlyArray<Middleware<UnknownObject, S>> = [
    ThunkMiddlewareFor<S>,
  ],
> = RenderHookResult<TResult, TProps> & {
  //
  // Helper methods left over from React 18 upgrade
  //

  /**
   * The act function which should be used with the renderHook.
   * @deprecated import `act` directly https://github.com/testing-library/react-hooks-testing-library/blob/chore/migration-guide/MIGRATION_GUIDE.md#wrapper-props
   */
  act: typeof act;

  /**
   * Await all async side effects
   * @deprecated use `act` directly https://github.com/testing-library/react-hooks-testing-library/blob/chore/migration-guide/MIGRATION_GUIDE.md#wrapper-props
   */
  waitForEffect(): Promise<void>;

  /**
   * Wait for the value to change
   * @deprecated use `result.current` and `waitFor` https://github.com/testing-library/react-hooks-testing-library/blob/chore/migration-guide/MIGRATION_GUIDE.md#waitfornextupdate
   */
  waitForNextUpdate(options?: waitForOptions): Promise<void>;

  /**
   * The act function which should be used with the renderHook.
   * @deprecated import `waitFor` directly https://github.com/testing-library/react-hooks-testing-library/blob/chore/migration-guide/MIGRATION_GUIDE.md#wrapper-props
   */
  waitFor: typeof waitFor;

  /**
   * https://github.com/testing-library/react-hooks-testing-library/blob/chore/migration-guide/MIGRATION_GUIDE.md#waitforvaluetochange
   */
  waitForValueToChange: typeof waitForValueToChange;

  //
  // PixieBrix-specific helper methods
  //

  getReduxStore(): EnhancedStore<S, A, M>;

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

    const ExtraWrapper = wrapper ?? (({ children }) => <>{children}</>);

    const Wrapper: React.FC<{ children: React.ReactElement }> = initialValues
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
      act,
      waitFor,
      waitForEffect,
      waitForValueToChange,
      async waitForNextUpdate(options?: waitForOptions) {
        // https://github.com/testing-library/react-hooks-testing-library/blob/chore/migration-guide/MIGRATION_GUIDE.md#waitfornextupdate
        const initialValue = utils.result.current;
        await waitFor(() => {
          expect(utils.result.current).not.toBe(initialValue);
        }, options);
      },
      getFormState() {
        return formValues;
      },
      getReduxStore() {
        return store;
      },
    };
  };
}
