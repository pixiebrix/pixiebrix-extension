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

import { ExtensionPointConfig, RecipeDefinition } from "@/types/definitions";
import { ServiceAuthPair } from "@/core";
import notify from "@/utils/notify";
import { useFormikContext } from "formik";
import { useAsyncState } from "@/hooks/common";
import { collectPermissions, ensureAllPermissions } from "@/permissions";
import { resolveRecipe } from "@/registry/internal";
import { containsPermissions, services } from "@/background/messenger/api";
import { useCallback } from "react";
import { reportEvent } from "@/telemetry/events";

function useEnsurePermissions(
  blueprint: RecipeDefinition,
  selected: ExtensionPointConfig[],
  serviceAuths: ServiceAuthPair[]
) {
  const { submitForm } = useFormikContext();

  const [permissionState, isPending, error] = useAsyncState(async () => {
    await services.refreshLocal();
    const permissions = await collectPermissions(
      await resolveRecipe(blueprint, selected),
      serviceAuths
    );
    const enabled = await containsPermissions(permissions);
    return {
      enabled,
      permissions,
    };
  }, [selected, serviceAuths]);

  const { enabled, permissions } = permissionState ?? {
    enabled: false,
    permissions: null,
  };

  const request = useCallback(async () => {
    let accepted = false;

    try {
      accepted = await ensureAllPermissions(permissions);
    } catch (error) {
      notify.error({
        message: "Error granting permissions",
        error,
      });
      return false;
    }

    if (!accepted) {
      // Event is tracked in `activate` callback
      notify.warning("You declined the permissions");
      return false;
    }

    return true;
  }, [permissions]);

  const activate = useCallback(() => {
    // Can't use async here because Firefox loses track of trusted UX event
    // eslint-disable-next-line @typescript-eslint/promise-function-async, promise/prefer-await-to-then
    void request().then((accepted: boolean) => {
      if (accepted) {
        reportEvent("MarketplaceActivate", {
          blueprintId: blueprint.metadata.id,
          extensions: selected.map((x) => x.label),
        });
        return submitForm();
      }

      reportEvent("MarketplaceRejectPermissions", {
        blueprintId: blueprint.metadata.id,
        extensions: selected.map((x) => x.label),
      });
    });
  }, [selected, request, submitForm, blueprint.metadata]);

  return {
    enabled,
    request,
    permissions,
    activate,
    isPending,
    extensions: selected,
    error,
  };
}

export default useEnsurePermissions;
