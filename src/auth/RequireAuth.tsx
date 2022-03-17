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
import { ApiError, useGetAuthQuery, useGetMeQuery } from "@/services/api";
import { updateUserData } from "@/auth/token";
import {
  selectExtensionAuthState,
  selectUserDataUpdate,
} from "@/auth/authUtils";
import { authActions } from "@/auth/authSlice";
import { anonAuth } from "@/auth/authConstants";
import { selectIsLoggedIn } from "@/auth/authSelectors";
import { Me } from "@/types/contract";

type RequireAuthProps = {
  LoginPage?: React.VFC;
};

const RequireAuth: React.FunctionComponent<RequireAuthProps> = ({
  children,
  LoginPage = () => null,
}) => {
  const dispatch = useDispatch();

  const isLoggedIn = useSelector(selectIsLoggedIn);
  const { isLoading, error, data: me } = useGetMeQuery();

  // TODO: remove this when useGetAuthQuery is no longer used
  const { isLoading: isAuthLoading } = useGetAuthQuery();

  console.log("require auth", {
    isLoggedIn,
    isLoading,
    me,
    error,
    isAuthLoading,
  });

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const setAuth = async (me: Me) => {
      if (me.id) {
        const update = selectUserDataUpdate(me);
        await updateUserData(update);
        const auth = selectExtensionAuthState(me);
        dispatch(authActions.setAuth(auth));
      } else {
        dispatch(authActions.setAuth(anonAuth));
      }
    };

    void setAuth(me);
  }, [isLoading, dispatch]);

  // Show SetupPage if there is auth error or user not logged in
  if ((error as ApiError)?.status === 401 || (!isLoading && !isLoggedIn)) {
    return <LoginPage />;
  }

  // Optimistically skip waiting if we have cached auth data
  // TODO remove isAuthLoading when useGetAuthQuery is no longer used
  if ((isLoading && !isLoggedIn) || isAuthLoading) {
    return <Loader />;
  }

  return <>{children}</>;
};

export default RequireAuth;
