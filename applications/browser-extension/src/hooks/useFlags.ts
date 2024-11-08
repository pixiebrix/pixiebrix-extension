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
import { useGetFeatureFlagsQuery } from "../data/service/api";
import {
  addAuthListener as addAuthStorageListener,
  removeAuthListener as removeAuthStorageListener,
} from "../auth/authStorage";
import type { FetchableAsyncState } from "@/types/sliceTypes";
import { mergeAsyncState } from "../utils/asyncStateUtils";
import {
  type FeatureFlag,
  mapRestrictedFeatureToFeatureFlag,
  type RestrictedFeature,
} from "../auth/featureFlags";

export type FlagHelpers = {
  permit: (area: RestrictedFeature) => boolean;
  restrict: (area: RestrictedFeature) => boolean;
  flagOn: (flag: FeatureFlag) => boolean;
  flagOff: (flag: FeatureFlag) => boolean;
};

type UseFlagsResult = FlagHelpers & {
  // The async state for use in deriving values that require valid flags. NOTE: the data is not serializable,
  // so the state might not work with any state helpers that require serializable data (e.g., due to cloning, Immer,
  // or Redux).
  state: FetchableAsyncState<FlagHelpers>;
};

/**
 * Hook for feature flags and organization restrictions.
 *
 * For permit/restrict, features will be restricted in the fetching/loading state.
 *
 * If not in a React context, use featureFlagStorage.flagOn.
 *
 * @see flagOn
 */
function useFlags(): UseFlagsResult {
  const queryState = useGetFeatureFlagsQuery();
  const { refetch } = queryState;

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
    const flagSet = new Set(queryState.data);

    const helpers: FlagHelpers = {
      permit: (area: RestrictedFeature) =>
        !flagSet.has(mapRestrictedFeatureToFeatureFlag(area)),
      restrict: (area: RestrictedFeature) =>
        flagSet.has(mapRestrictedFeatureToFeatureFlag(area)),
      flagOn: (flag: FeatureFlag) => flagSet.has(flag),
      flagOff: (flag: FeatureFlag) => !flagSet.has(flag),
    };

    return {
      ...helpers,
      state: {
        ...mergeAsyncState(queryState, () => helpers),
        refetch: queryState.refetch,
      },
    };
  }, [queryState]);
}

export default useFlags;
