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

import { type ModViewItem } from "@/types/modTypes";
import { useDispatch, useSelector } from "react-redux";
import useFlags from "@/hooks/useFlags";
import {
  getLabel,
  isModDefinition,
  selectComponentsFromMod,
} from "@/utils/modUtils";
import { useCallback } from "react";
import useUserAction from "@/hooks/useUserAction";
import {
  deactivateModComponents,
  deactivateMod,
} from "@/store/deactivateUtils";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { type ModComponentState } from "@/store/modComponents/modComponentTypes";
import { RestrictedFeatures } from "@/auth/featureFlags";

function useDeactivateAction(modViewItem: ModViewItem): (() => void) | null {
  const dispatch = useDispatch();
  const { restrict } = useFlags();
  const { mod, status, sharing } = modViewItem;
  const isActive = status === "Active" || status === "Paused";
  const isDeployment = sharing.source.type === "Deployment";

  // Restricted users aren't allowed to deactivate/reactivate deployments. They are controlled by the admin from the
  // Admin Console. See restricted flag logic here:
  // https://github.com/pixiebrix/pixiebrix-app/blob/5b30c50d7f9ca7def79fd53ba8f78e0f800a0dcb/api/serializers/account.py#L198-L198
  const isRestricted =
    isDeployment && restrict(RestrictedFeatures.DEACTIVATE_DEPLOYMENT);

  // Without memoization, the selector reference changes on every render, which causes useModPermissions
  // to recompute, spamming the background worker with service locator requests
  const memoizedModComponentsSelector = useCallback(
    (state: { options: ModComponentState }) =>
      selectComponentsFromMod(state, mod),
    [mod],
  );

  const modComponentsFromMod = useSelector(memoizedModComponentsSelector);

  const deactivate = useUserAction(
    async () => {
      if (isModDefinition(mod)) {
        const modId = mod.metadata.id;
        await deactivateMod(modId, modComponentsFromMod, dispatch);

        reportEvent(Events.MOD_REMOVE, {
          modId,
        });
      } else {
        await deactivateModComponents(
          modComponentsFromMod.map(({ id }) => id),
          dispatch,
        );

        for (const modComponent of modComponentsFromMod) {
          reportEvent(Events.MOD_COMPONENT_REMOVE, {
            modComponentId: modComponent.id,
          });
        }
      }
    },
    {
      successMessage: `Deactivated mod: ${getLabel(mod)}`,
      errorMessage: `Error deactivating mod: ${getLabel(mod)}`,
    },
    [mod, modComponentsFromMod],
  );

  return isActive && !isRestricted ? deactivate : null;
}

export default useDeactivateAction;
