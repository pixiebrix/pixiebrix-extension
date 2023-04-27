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
import { type AsyncState } from "@/types/sliceTypes";
import Loader from "@/components/Loader";

/**
 * Renders the children if the state is not loading or errored
 * @see useAsyncState
 * @see mergeAsyncState
 */
const AsyncStateGateNew = <Data,>(
  props: PropsWithoutRef<{
    /**
     * AsyncState from useAsyncState
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
    renderError?: (args: { error: unknown }) => React.ReactElement;
  }>
): React.ReactElement => {
  const { children, state, renderError, renderLoader } = props;
  const { isLoading, isError, data, error } = state;

  if (isLoading) {
    return renderLoader ? renderLoader() : <Loader />;
  }

  if (isError) {
    if (renderError) {
      return renderError({ error });
    }

    throw error;
  }

  return <>{children({ data })}</>;
};

export default AsyncStateGateNew;
