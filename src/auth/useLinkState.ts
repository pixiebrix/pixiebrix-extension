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

import { useAsyncState } from "@/hooks/common";
import {
  addListener as addAuthListener,
  isLinked,
  removeListener as removeAuthListener,
} from "@/auth/token";
import { useEffect } from "react";

type LinkState = {
  hasToken: boolean | undefined;
  tokenLoading: boolean;
  tokenError: unknown;
};

/**
 * Hook to get link state, and automatically update if extension becomes linked/unlinked.
 *
 * TODO: this should use Redux to ensure UI is in sync, as it is referenced by multiple place. OK for now because the
 *   isLinked check is fast and side-effect free.
 *
 * @see isLinked
 */
function useLinkState(): LinkState {
  // See component documentation for why both isLinked and useGetMeQuery are required
  // hasToken is true for either native PixieBrix token, or partner Bearer JWT
  const [hasToken, tokenLoading, tokenError, refreshTokenState] = useAsyncState(
    isLinked,
    []
  );

  useEffect(() => {
    // Listen for token invalidation
    const handler = async () => {
      console.debug("Auth state changed, checking for token");
      void refreshTokenState();
    };

    addAuthListener(handler);

    return () => {
      removeAuthListener(handler);
    };
  }, [refreshTokenState]);

  return {
    hasToken,
    tokenLoading,
    tokenError,
  };
}

export default useLinkState;
