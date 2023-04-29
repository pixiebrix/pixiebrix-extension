/* eslint-disable @typescript-eslint/no-explicit-any -- test factories */
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

import { type UseQueryHookResult } from "@reduxjs/toolkit/dist/query/react/buildHooks";
import { type QueryDefinition, QueryStatus } from "@reduxjs/toolkit/query";

/**
 * Factory to create an RTK Query loading state.
 */
export function queryLoadingFactory(): UseQueryHookResult<
  QueryDefinition<any, any, any, any>
> {
  return {
    data: undefined,
    currentData: undefined,
    isLoading: true,
    isSuccess: false,
    isError: false,
    isUninitialized: false,
    refetch: jest.fn(),
    isFetching: true,
    status: QueryStatus.pending,
  } as any;
}

/**
 * Factory to create an RTK Query success state.
 */
export function querySuccessFactory<T>(
  data: T,
  { isFetching }: { isFetching?: boolean } = {}
): UseQueryHookResult<QueryDefinition<any, any, any, T>> {
  // Define as function instead of `define` to enforce valid state.

  const fetchState = isFetching
    ? {
        isFetching: true,
        currentData: undefined,
      }
    : {
        isFetching: false,
        currentData: data,
      };

  return {
    data,
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: undefined,
    isUninitialized: false,
    refetch: jest.fn(),
    status: QueryStatus.fulfilled,
    fulfilledTimeStamp: Date.now(),
    ...fetchState,
  };
}

/**
 * Factory to create an RTK Query errors state.
 */
export function queryErrorFactory(
  error: unknown,
  { isFetching }: { isFetching?: boolean } = {}
): UseQueryHookResult<QueryDefinition<any, any, any, any>> {
  // Define as function instead of `define` to enforce valid state.
  const fetchState = isFetching
    ? {
        isFetching: true,
      }
    : {
        isFetching: false,
      };

  return {
    data: undefined,
    currentData: undefined,
    isLoading: false,
    isSuccess: false,
    isError: true,
    error,
    isUninitialized: false,
    refetch: jest.fn(),
    status: QueryStatus.rejected,
    ...fetchState,
  } as any;
}
