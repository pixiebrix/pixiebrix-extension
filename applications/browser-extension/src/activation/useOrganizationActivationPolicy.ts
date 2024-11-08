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

import useFlags, { type FlagHelpers } from "@/hooks/useFlags";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { RestrictedFeatures } from "@/auth/featureFlags";
import { useSelector } from "react-redux";
import { selectOrganizations } from "@/auth/authSelectors";
import { type FetchableAsyncState } from "@/types/sliceTypes";
import useMergeAsyncState from "@/hooks/useMergeAsyncState";

export type OrganizationActivationPolicyResult = {
  /**
   * True if the user should be blocked from activating the mod definition.
   */
  block: boolean;
};

/**
 * Returns true if the user should be blocked from activating the mod definition due to an organization policy
 * @param modDefinition the mod definition
 */
function useOrganizationActivationPolicy(
  modDefinition: ModDefinition,
): FetchableAsyncState<OrganizationActivationPolicyResult> {
  const organizations = useSelector(selectOrganizations);
  const { state } = useFlags();

  return useMergeAsyncState(state, ({ restrict }: FlagHelpers) => {
    // Reject mods that are public for which the user is not a member of any organizations the mod is shared with
    if (
      restrict(RestrictedFeatures.MARKETPLACE) &&
      modDefinition.sharing.public
    ) {
      const userOrganizations = new Set(organizations.map((x) => x.id));
      return {
        block: !modDefinition.sharing.organizations.some((x) =>
          userOrganizations.has(x),
        ),
      };
    }

    return {
      block: false,
    };
  });
}

export default useOrganizationActivationPolicy;
