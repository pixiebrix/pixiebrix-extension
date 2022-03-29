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

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Loader from "@/components/Loader";
import { ApiError, useGetMeQuery } from "@/services/api";
import { isLinked, updateUserData } from "@/auth/token";
import {
  selectExtensionAuthState,
  selectUserDataUpdate,
} from "@/auth/authUtils";
import { authActions } from "@/auth/authSlice";
import { anonAuth } from "@/auth/authConstants";
import { selectIsLoggedIn } from "@/auth/authSelectors";
import { Me } from "@/types/contract";
import { useAsyncState } from "@/hooks/common";

type RequireAuthProps = {
  /** Rendered in case of 401 response */
  LoginPage: React.VFC;

  /** Rendered request to `/me` fails */
  ErrorPage?: React.VFC<{ error: unknown }>;
};

/**
 * Require that the extension is linked to the PixieBrix API (has a token) and that the user is authenticated.
 *
 * - Axios passes the session along with requests (even for CORS, it seems). So safe (GET) methods succeed with
 *   just the session cookies. However, the server needs an X-CSRFToken token for unsafe methods (e.g., POST, DELETE).
 *   NOTE: the CSRF token for session authentication is _not_ the same as the Authentication header token for
 *   token-based authentication.
 * - Therefore, also check the extension has received the Authentication header token from the server.
 */
const RequireAuth: React.FC<RequireAuthProps> = ({
  children,
  LoginPage,
  ErrorPage,
}) => {
  const dispatch = useDispatch();

  const isLoggedIn = useSelector(selectIsLoggedIn);
  // See component documentation for why both isLinked and useGetMeQuery are required
  const [hasToken, tokenLoading, tokenError] = useAsyncState(
    async () => isLinked(),
    []
  );
  const { isLoading: meLoading, error, data: me } = useGetMeQuery();

  const isLoading = tokenLoading || meLoading;

  useEffect(() => {
    // Before we get the first response from API, use the AuthRootState persisted with redux-persist.
    if (meLoading) {
      return;
    }

    // If me succeeds or errors, update the AuthRootState stored with redux-persist and updateUserData stored directly
    // in browser.storage (that's used by the background page)
    const setAuth = async (me: Me) => {
      const update = selectUserDataUpdate(me);
      await updateUserData(update);

      // `me` is nullish if the request errored
      if (me?.id) {
        const auth = selectExtensionAuthState(me);
        dispatch(authActions.setAuth(auth));
      } else {
        dispatch(authActions.setAuth(anonAuth));
      }
    };

    void setAuth(me);
  }, [meLoading, me, dispatch]);

  // Show SetupPage if there is auth error or user not logged in
  if (
    // Currently, useGetMeQuery will only return a 401 if the user has a non-empty invalid token. If the extension
    // is not linked, the extension client leaves off the token header. And our backend returns an empty object if
    // the user is not authenticated.
    // http://github.com/pixiebrix/pixiebrix-app/blob/0686663bf007cf4b33d547d9f124d1fa2a83ec9a/api/views/site.py#L210-L210
    // See: https://github.com/pixiebrix/pixiebrix-extension/issues/3056
    (error as ApiError)?.status === 401 ||
    (!isLoggedIn && !meLoading) ||
    (!hasToken && !tokenLoading)
  ) {
    return <LoginPage />;
  }

  if (error ?? tokenError) {
    if (ErrorPage) {
      return <ErrorPage error={error ?? tokenError} />;
    }

    throw error;
  }

  // Optimistically skip waiting if we have cached auth data
  if (!isLoggedIn && isLoading) {
    return <Loader />;
  }

  return <>{children}</>;
};

export default RequireAuth;
