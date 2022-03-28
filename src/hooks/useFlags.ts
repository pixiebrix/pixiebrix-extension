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

import { useMemo } from "react";
import { selectFlags } from "@/auth/authSelectors";
import { useSelector } from "react-redux";

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
  const flags = useSelector(selectFlags);

  return useMemo(() => {
    const flagSet = new Set(flags);

    return {
      permit: (area: RestrictedFeature) =>
        !flagSet.has(`${RESTRICTED_PREFIX}-${area}`),
      restrict: (area: RestrictedFeature) =>
        flagSet.has(`${RESTRICTED_PREFIX}-${area}`),
      flagOn: (flag: string) => flagSet.has(flag),
      flagOff: (flag: string) => !flagSet.has(flag),
    };
  }, [flags]);
}

export default useFlags;
