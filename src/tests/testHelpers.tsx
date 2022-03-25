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
import { render } from "@testing-library/react";
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
  defaultProps: TProps;
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
