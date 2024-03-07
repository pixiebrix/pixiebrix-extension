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

import { useEffect, useMemo } from "react";
import { useGetFeatureFlagsQuery } from "@/data/service/api";
import {
  addListener as addAuthStorageListener,
  removeListener as removeAuthStorageListener,
} from "@/auth/authStorage";

const RESTRICTED_PREFIX = "restricted";

// Flags controlled on backend at http://github.com/pixiebrix/pixiebrix-app/blob/f082ff5161ff79f696d9a8c35c755430e88fa4ab/api/serializers/account.py#L173-L173
type RestrictedFeature =
  | "workshop"
  | "services"
  | "permissions"
  | "reset"
  | "marketplace"
  | "uninstall"
  | "clear-token"
  | "service-url"
  | "page-editor";

export type Restrict = {
  // XXX: Asynchronous state flags. Consider returning a standard AsyncState. Typically, AsyncState is used with
  // serializable values, though, so there may be gotchas in some circumstances.
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  // Methods
  permit: (area: RestrictedFeature) => boolean;
  restrict: (area: RestrictedFeature) => boolean;
  flagOn: (flag: string) => boolean;
  flagOff: (flag: string) => boolean;
};

/**
 * Hook for feature flags and organization restrictions.
 *
 * For permit/restrict, features will be restricted in the fetching/loading state
 */
function useFlags(): Restrict {
  const {
    data: flags,
    isLoading,
    isFetching,
    isError,
    isSuccess,
    refetch,
  } = useGetFeatureFlagsQuery();

  useEffect(() => {
    const listener = () => {
      void refetch();
    };

    addAuthStorageListener(listener);

    return () => {
      removeAuthStorageListener(listener);
    };
  }, [refetch]);

  return useMemo(() => {
    const flagSet = new Set(flags);

    return {
      isLoading,
      isFetching,
      isSuccess,
      isError,
      permit: (area: RestrictedFeature) =>
        !flagSet.has(`${RESTRICTED_PREFIX}-${area}`),
      restrict: (area: RestrictedFeature) =>
        flagSet.has(`${RESTRICTED_PREFIX}-${area}`),
      flagOn: (flag: string) => flagSet.has(flag),
      flagOff: (flag: string) => !flagSet.has(flag),
    };
  }, [flags, isLoading, isFetching, isError, isSuccess]);
}

export default useFlags;
