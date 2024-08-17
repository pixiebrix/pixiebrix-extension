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
import { useDispatch } from "react-redux";
import useFlags from "@/hooks/useFlags";
import { isModComponentFromMod, isModDefinition } from "@/utils/modUtils";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { push } from "connected-react-router";
import notify from "@/utils/notify";
import { assertNotNullish } from "@/utils/nullishUtils";
import { RestrictedFeatures } from "@/auth/featureFlags";

const useReactivateAction = (modViewItem: ModViewItem): (() => void) | null => {
  const dispatch = useDispatch();
  const { restrict } = useFlags();
  const { mod, unavailable, status, sharing } = modViewItem;
  const hasModDefinition = isModComponentFromMod(mod) || isModDefinition(mod);
  const isActive = status === "Active" || status === "Paused";
  const isDeployment = sharing.source.type === "Deployment";
  const isRestricted =
    isDeployment && restrict(RestrictedFeatures.DEACTIVATE_DEPLOYMENT);

  const reactivate = () => {
    if (hasModDefinition) {
      const modId = isModDefinition(mod) ? mod.metadata.id : mod._recipe?.id;

      assertNotNullish(modId, "modId is required to reactivate mod");

      reportEvent(Events.START_MOD_ACTIVATE, {
        modId,
        screen: "extensionConsole",
        reinstall: true,
      });

      const reactivatePath = `marketplace/activate/${encodeURIComponent(
        modId,
      )}?reinstall=1`;

      dispatch(push(reactivatePath));
    } else {
      // This should never happen, because the hook will return `reactivate: null` for mods with no
      // associated blueprint
      notify.error({
        error: new Error("Cannot reactivate item with no associated mod"),
      });
    }
  };

  // Only blueprints/deployments can be reactivated. (Because there's no reason to reactivate an extension... there's
  // no activation-time integrations/options associated with them.)
  return hasModDefinition && isActive && !isRestricted && !unavailable
    ? reactivate
    : null;
};

export default useReactivateAction;
