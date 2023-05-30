/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type InstallableViewItem } from "@/installables/installableTypes";
import { useDispatch } from "react-redux";
import useFlags from "@/hooks/useFlags";
import { isExtension, isExtensionFromRecipe } from "@/utils/installableUtils";
import { reportEvent } from "@/telemetry/events";
import { push } from "connected-react-router";
import notify from "@/utils/notify";

const useReactivateAction = (
  installableViewItem: InstallableViewItem
): (() => void | null) => {
  const dispatch = useDispatch();
  const { restrict } = useFlags();
  const { installable, unavailable, status, sharing } = installableViewItem;
  const isInstallableBlueprint = !isExtension(installable);
  const hasBlueprint =
    isExtensionFromRecipe(installable) || isInstallableBlueprint;
  const isActive = status === "Active" || status === "Paused";
  const isDeployment = sharing.source.type === "Deployment";
  const isRestricted = isDeployment && restrict("uninstall");

  const reactivate = () => {
    if (hasBlueprint) {
      const blueprintId = isInstallableBlueprint
        ? installable.metadata.id
        : installable._recipe.id;

      reportEvent("StartInstallBlueprint", {
        blueprintId,
        screen: "extensionConsole",
        reinstall: true,
      });

      const reactivatePath = `marketplace/activate/${encodeURIComponent(
        blueprintId
      )}?reinstall=1`;

      dispatch(push(reactivatePath));
    } else {
      // This should never happen, because the hook will return `reactivate: null` for installables with no
      // associated blueprint
      notify.error({
        error: new Error("Cannot reactivate item with no associated mod"),
      });
    }
  };

  // Only blueprints/deployments can be reactivated. (Because there's no reason to reactivate an extension... there's
  // no activation-time integrations/options associated with them.)
  return hasBlueprint && isActive && !isRestricted && !unavailable
    ? reactivate
    : null;
};

export default useReactivateAction;
