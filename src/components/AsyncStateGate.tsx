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

import React, { type PropsWithoutRef } from "react";
import Loader from "@/components/Loader";
import { getErrorMessage } from "@/errors/errorHelpers";
import { type AsyncState, type FetchableAsyncState } from "@/types/sliceTypes";
import { Button } from "react-bootstrap";

/**
 *  A standard error display for use with AsyncStateGate
 * @constructor
 */
export const StandardError = ({
  error,
  refetch,
}: {
  error: unknown;
  refetch?: () => void;
}) => (
  <div>
    <div className="text-danger">
      Error fetching data: {getErrorMessage(error)}
    </div>
    {refetch && (
      <div>
        <Button variant="info" onClick={refetch}>
          Try again
        </Button>
      </div>
    )}
  </div>
);

/**
 * Renders the children if the state is not loading or errored
 * @see useAsyncState
 */
const AsyncStateGate = <Data,>(
  props: PropsWithoutRef<{
    /**
     * FetchableAsyncState or AsyncState from useAsyncState
     * @see useAsyncState
     */
    state: AsyncState<Data>;
    /**
     * Children to render once the state is loaded
     * @param args
     */
    children: (args: { data: Data }) => React.ReactElement;
    /**
     * If provided, the loader will be rendered instead of the default loader
     */
    renderLoader?: () => React.ReactElement;
    /**
     * If provided, the error will be rendered instead of throwing it
     * @see StandardError
     */
    renderError?: (args: {
      error: unknown;
      refetch?: () => void;
    }) => React.ReactElement;
  }>
): React.ReactElement => {
  const { children, state, renderError, renderLoader } = props;
  const {
    data,
    isLoading,
    isUninitialized,
    isFetching,
    isError,
    refetch,
    error,
    // I couldn't get type inference to work at the callsites to allow State extends AsyncState<Data> & {refetch}
  } = state as unknown as FetchableAsyncState<Data>;

  if (isUninitialized || isLoading || (isError && isFetching)) {
    return renderLoader ? renderLoader() : <Loader />;
  }

  if (isError) {
    if (renderError) {
      return renderError({ error, refetch });
    }

    throw error;
  }

  return <>{children({ data })}</>;
};

export default AsyncStateGate;
