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

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Loader from "@/components/Loader";
import { useGetMeQuery } from "@/data/service/api";
import { clearCachedAuthSecrets, updateUserData } from "@/auth/authStorage";
import {
  selectExtensionAuthState,
  selectUserDataUpdate,
} from "@/auth/authUtils";
import { authActions } from "@/auth/authSlice";
import { anonAuth } from "@/auth/authConstants";
import { selectIsLoggedIn } from "@/auth/authSelectors";
import { type AxiosError } from "axios";
import useRequiredPartnerAuth from "@/auth/useRequiredPartnerAuth";
import useLinkState from "@/auth/useLinkState";
import { type Me } from "@/data/model/Me";
import { type Location } from "history";

type RequireAuthProps = {
  /** Rendered in case of 401 response */
  LoginPage: React.FC;
  /**
   * Ignore network errors. Set to 'false' to avoid prompting on login if there are intermittent network errors
   * or PixieBrix service degradation.
   */
  ignoreApiError?: boolean;
  /**
   * The current page location, exposed as a prop so that react-router can override the window location if needed
   */
  location?: Location;
};

/**
 * Hook to determine authentication status. Authentication can be via native PixieBrix token, or partner Bearer JWT.
 */
const useRequiredAuth = () => {
  const dispatch = useDispatch();
  const hasCachedLoggedIn = useSelector(selectIsLoggedIn);
  const { data: isLinked, isLoading: isLinkedLoading } = useLinkState();

  const {
    isLoading: meLoading,
    error: meError,
    data: me,
    isSuccess: isMeSuccess,
  } = useGetMeQuery(undefined, {
    // Only call the Me endpoint if the extension is "linked" is with an Authorization token. If not, the session id will
    // be passed in the header which leads to inconsistent results depending on whether the session is still valid
    skip: !isLinked,
  });

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
      if (me) {
        const auth = selectExtensionAuthState(me);
        dispatch(authActions.setAuth(auth));
      } else {
        dispatch(authActions.setAuth(anonAuth));
      }
    };

    void setAuth(me);
  }, [isMeSuccess, me, dispatch]);

  // Server returns 401 from the Me endpoint only if the token (native token or partner JWT) is invalid
  const isBadToken = (meError as AxiosError)?.response?.status === 401;
  useEffect(() => {
    if (isBadToken) {
      console.warn(
        "Resetting extension auth because session or partner JWT was rejected by PixieBrix API",
      );
      void clearCachedAuthSecrets();
    }
  }, [isBadToken]);

  const isAccountUnlinked =
    isBadToken ||
    (!hasCachedLoggedIn && !meLoading) ||
    (!isLinked && !isLinkedLoading);

  return {
    isAccountUnlinked,
    hasToken: isLinked,
    hasCachedLoggedIn,
    isLoading: isLinkedLoading || meLoading,
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
  location = window.location,
}) => {
  // This is a very simplified version of what otherwise useRouteMatch from react-router would do.
  // We don't want to pull the Router into the Page Editor app when it uses this component.
  const isSettingsPage = location.pathname.startsWith("/settings");
  const isStartPage = location.pathname.startsWith("/start");

  const {
    isAccountUnlinked,
    hasCachedLoggedIn,
    isLoading: isRequiredAuthLoading,
    meError,
  } = useRequiredAuth();

  const {
    hasPartner,
    requiresIntegration,
    hasConfiguredIntegration,
    isLoading: isPartnerAuthLoading,
  } = useRequiredPartnerAuth();

  if (isSettingsPage) {
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
    isStartPage ||
    isAccountUnlinked ||
    (requiresIntegration && !hasConfiguredIntegration)
  ) {
    console.debug("Showing login page", {
      isStartPage,
      isAccountUnlinked,
      requiresIntegration,
      hasConfiguredIntegration,
      hasPartner,
    });

    return <LoginPage />;
  }

  // Optimistically skip waiting if we have cached auth data
  if (!hasCachedLoggedIn && (isRequiredAuthLoading || isPartnerAuthLoading)) {
    return <Loader />;
  }

  // `useRequiredAuth` handles 401 and other auth-related errors. Rethrow any other errors, e.g., internal server error
  if (meError && !ignoreApiError) {
    throw meError as Error;
  }

  return <>{children}</>;
};

export default RequireAuth;
