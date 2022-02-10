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

import { useGetAuthQuery } from "@/services/api";
import { useMemo } from "react";

const RESTRICTED_PREFIX = "restricted";

// Flags controlled on backend at http://github.com/pixiebrix/pixiebrix-app/blob/f082ff5161ff79f696d9a8c35c755430e88fa4ab/api/serializers/account.py#L173-L173
export type RestrictedFeature =
  | "workshop"
  | "services"
  | "permissions"
  | "reset"
  | "marketplace"
  | "uninstall"
  | "clear-token"
  | "service-url";

type Restrict = {
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
  // Future improvements:
  // - Let caller of each method decide what to do during pending state, (i.e., add default argument)
  // - Store flags in local storage to fetch faster than the query (and use last known values as fallback)
  // - Standardize use of environment="development" and DEBUG in react app

  const { data, isFetching, error } = useGetAuthQuery();

  return useMemo(() => {
    const { flags = [] } = data ?? {};
    const pending = Boolean(error) || isFetching;

    const flagSet = new Set(flags);

    return {
      permit: (area: RestrictedFeature) =>
        !pending && !flagSet.has(`${RESTRICTED_PREFIX}-${area}`),
      restrict: (area: RestrictedFeature) =>
        pending || flagSet.has(`${RESTRICTED_PREFIX}-${area}`),
      flagOn: (flag: string) => !pending && flagSet.has(flag),
      flagOff: (flag: string) => pending || !flagSet.has(flag),
    };
  }, [data, isFetching, error]);
}

export default useFlags;
