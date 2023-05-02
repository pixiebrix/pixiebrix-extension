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

/**
 * Common shape for AsyncState from RTK Query, useAsyncState, and other async sources.
 *
 * See explanation here: https://redux-toolkit.js.org/rtk-query/usage/queries#query-loading-state
 */
export type AsyncState<TData = unknown> = {
  /**
   * The latest returned result regardless of hook arg, if present.
   */
  data?: TData | undefined;

  /**
   * The latest returned result for the current hook arg, if present.
   */
  currentData?: TData | undefined;

  /**
   * When true, indicates that the query has not started yet.
   *
   * For example, because the query has been skipped due to conditional fetching.
   * See: https://redux-toolkit.js.org/rtk-query/usage/conditional-fetching#overview
   */
  isUninitialized: boolean;

  /**
   * When true, indicates that the query is currently fetching, but might have data from an earlier request. This will
   * be true for both the first request fired off, as well as subsequent requests.
   */
  isFetching: boolean;

  /**
   * When true, indicates that the query is currently loading for the first time, and has no data yet.
   * This will be true for the first request fired off, but not for subsequent requests.
   */
  isLoading: boolean;

  /**
   * When true, indicates that the query has data from a successful request.
   */
  isSuccess: boolean;

  /**
   * When true, indicates that the query is in an error state.
   */
  isError: boolean;

  /**
   * The error result if present.
   */
  error?: unknown;
};

/**
 * AsyncState that can be re-fetched/re-calculated.
 */
export type FetchableAsyncState<Data = unknown> = AsyncState<Data> & {
  /**
   * A function to force refetch the query
   */
  refetch: () => void;
};

/**
 * An type for characterizing hook output that's similar to RTK Query's state.
 */
export type UseCachedQueryResult<TData> = FetchableAsyncState<TData> & {
  /**
   * When true, the query to fetch data from the local data source has not started yet
   */
  isCacheUninitialized: boolean;

  /**
   * When true, indicates that the query is currently fetching data from the local database/cache.
   */
  isLoadingFromCache: boolean;

  /**
   * When true, the query to fetch data from the remote data source for the first time is in progress.
   */
  isLoadingFromRemote: boolean;

  /**
   * When true, indicates the query is fetching data from the remote data source.
   */
  isFetchingFromRemote: boolean;

  /**
   * When true, the query to fetch data from the remote data source has not started yet.
   */
  isRemoteUninitialized: boolean;
};

export type AsyncStateArray = readonly AsyncState[];

export type FetchableAsyncStateArray = readonly FetchableAsyncState[];

export type ExtractValueType<T extends readonly AsyncState[]> = {
  [index in keyof T]: T[index] extends T[number] ? T[index]["data"] : never;
};

/**
 * Helper type to extract value types from an array of AsyncState
 */
export type AsyncValueArray<AsyncStates extends AsyncStateArray> =
  ExtractValueType<AsyncStates>;
