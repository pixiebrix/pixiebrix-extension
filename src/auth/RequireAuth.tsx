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
import { useGetMeQuery } from "@/services/api";
import {
  addListener as addAuthListener,
  removeListener as removeAuthListener,
  isLinked,
  updateUserData,
  clearExtensionAuth,
} from "@/auth/token";
import {
  selectExtensionAuthState,
  selectUserDataUpdate,
} from "@/auth/authUtils";
import { authActions } from "@/auth/authSlice";
import { anonAuth } from "@/auth/authConstants";
import { selectIsLoggedIn } from "@/auth/authSelectors";
import { Me } from "@/types/contract";
import { useAsyncState } from "@/hooks/common";
import { AxiosError } from "axios";
import useRequiredPartnerAuth from "@/auth/useRequiredPartnerAuth";
import { useRouteMatch } from "react-router";

type RequireAuthProps = {
  /** Rendered in case of 401 response */
  LoginPage: React.VFC;
  /**
   * Ignore network errors. Set to 'false' to avoid prompting on login if there are intermittent network errors
   * or PixieBrix service degradation.
   */
  ignoreApiError?: boolean;
};

export const useRequiredAuth = () => {
  const dispatch = useDispatch();

  const hasCachedLoggedIn = useSelector(selectIsLoggedIn);

  // See component documentation for why both isLinked and useGetMeQuery are required
  const [hasToken, tokenLoading, tokenError, refreshTokenState] = useAsyncState(
    async () => isLinked(),
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

  const {
    isLoading: meLoading,
    error: meError,
    data: me,
    isSuccess: isMeSuccess,
  } = useGetMeQuery(null, {
    // Only call /api/me/ if the extension is "linked" is with an Authorization token. If not, the session id will
    // be passed in the header which leads to inconsistent results depending on whether the session is still valid
    skip: !hasToken,
  });

  const isLoading = tokenLoading || meLoading;

  useEffect(() => {
    // Before we get the first response from API, use the AuthRootState persisted with redux-persist.

    // The `Me` call should never error unless there's network connectivity issues or the PixieBrix server is down.
    // In this case, we should keep whatever was in redux-persist
    if (!isMeSuccess) {
      return;
    }

    // If me succeeds, update the AuthRootState stored with redux-persist and updateUserData stored directly
    // in browser.storage (that's used by the background page)
    const setAuth = async (me: Me) => {
      const update = selectUserDataUpdate(me);
      await updateUserData(update);

      // Because we're waiting to the Authorization token, there should always be a value here. But, defensively, if
      // not, then reset to the anonymous state
      if (me?.id) {
        const auth = selectExtensionAuthState(me);
        dispatch(authActions.setAuth(auth));
      } else {
        dispatch(authActions.setAuth(anonAuth));
      }
    };

    void setAuth(me);
  }, [isMeSuccess, me, dispatch]);

  const isUnauthenticated = (meError as AxiosError)?.response?.status === 401;

  // FIXME: this should be in a useEffect
  if (isUnauthenticated) {
    console.warn("Clearing extension auth state because token was rejected");
    void clearExtensionAuth();
  }

  const isAccountUnlinked =
    isUnauthenticated ||
    (!hasCachedLoggedIn && !meLoading) ||
    (!hasToken && !tokenLoading);

  console.debug("isAccountUnlinked", {
    isUnauthenticated,
    hasCachedLoggedIn,
    meLoading,
    hasToken,
    tokenLoading,
  });

  return {
    isAccountUnlinked,
    hasToken,
    tokenError,
    hasCachedLoggedIn,
    isLoading,
    meError,
  };
};

/**
 * Require that the extension is linked to the PixieBrix API (has a token) and that the user is authenticated.
 *
 * - Axios passes the session along with requests (even for CORS, it seems). So safe (GET) methods succeed with
 *   just the session cookies. However, the server needs an X-CSRFToken token for unsafe methods (e.g., POST, DELETE).
 *   NOTE: the CSRF token for session authentication is _not_ the same as the Authentication header token for
 *   token-based authentication.
 * - Therefore, also check the extension has the Authentication header token from the server.
 */
const RequireAuth: React.FC<RequireAuthProps> = ({
  children,
  LoginPage,
  ignoreApiError = false,
}) => {
  const matchSettings = useRouteMatch({ path: "/settings", exact: true });

  const {
    isAccountUnlinked,
    tokenError,
    hasCachedLoggedIn,
    isLoading: isRequiredAuthLoading,
    meError,
  } = useRequiredAuth();

  const {
    requiresIntegration,
    hasConfiguredIntegration,
    isLoading: isPartnerAuthLoading,
  } = useRequiredPartnerAuth();

  if (matchSettings) {
    // Always let people see the settings page in order to fix broken settings
    return <>{children}</>;
  }

  // Show SetupPage if there is auth error or user not logged in
  if (
    // Currently, useGetMeQuery will only return a 401 if the user has a non-empty invalid token. If the extension
    // is not linked, the extension client leaves off the token header. And our backend returns an empty object if
    // the user is not authenticated.
    // http://github.com/pixiebrix/pixiebrix-app/blob/0686663bf007cf4b33d547d9f124d1fa2a83ec9a/api/views/site.py#L210-L210
    // See: https://github.com/pixiebrix/pixiebrix-extension/issues/3056
    isAccountUnlinked ||
    (requiresIntegration && !hasConfiguredIntegration)
  ) {
    console.debug("Showing login page", {
      isAccountUnlinked,
      requiresIntegration,
      hasConfiguredIntegration,
    });

    return <LoginPage />;
  }

  // Optimistically skip waiting if we have cached auth data
  if (!hasCachedLoggedIn && (isRequiredAuthLoading || isPartnerAuthLoading)) {
    return <Loader />;
  }

  // `useRequiredAuth` handles 401 and other auth-related errors. Rethrow any other errors, e.g., internal server error
  if (meError && !ignoreApiError) {
    throw meError;
  }

  if (tokenError) {
    throw tokenError;
  }

  return <>{children}</>;
};

export default RequireAuth;
