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

import useActivateAction from "@/extensionConsole/pages/blueprints/hooks/useActivateAction";
import useViewPublishAction from "@/extensionConsole/pages/blueprints/hooks/useViewPublishAction";
import useMarketplaceUrl from "@/mods/hooks/useMarketplaceUrl";
import useViewShareAction from "@/extensionConsole/pages/blueprints/hooks/useViewShareAction";
import useDeleteExtensionAction from "@/mods/hooks/useDeleteExtensionAction";
import useReactivateAction from "@/extensionConsole/pages/blueprints/hooks/useReactivateAction";
import { type ModViewItem } from "@/mods/modTypes";
import useRequestPermissionsAction from "@/mods/hooks/useRequestPermissionsAction";
import useViewLogsAction from "@/extensionConsole/pages/blueprints/hooks/useViewLogsAction";
import useDeactivateAction from "@/mods/hooks/useDeactivateAction";

type ActionCallback = () => void;

export type BlueprintsPageActions = {
  reactivate: ActionCallback | null;
  activate: ActionCallback | null;
  viewPublish: ActionCallback | null;
  viewInMarketplaceHref: string | null;
  viewShare: ActionCallback | null;
  deleteExtension: ActionCallback | null;
  deactivate: ActionCallback | null;
  viewLogs: ActionCallback | null;
  requestPermissions: ActionCallback | null;
};

function useBlueprintsPageActions(
  installableViewItem: ModViewItem
): BlueprintsPageActions {
  const marketplaceListingUrl = useMarketplaceUrl(installableViewItem);
  const viewPublish = useViewPublishAction(installableViewItem);
  const viewShare = useViewShareAction(installableViewItem);
  const reactivate = useReactivateAction(installableViewItem);
  const viewLogs = useViewLogsAction(installableViewItem);
  const activate = useActivateAction(installableViewItem);
  const deactivate = useDeactivateAction(installableViewItem);
  const deleteExtension = useDeleteExtensionAction(installableViewItem);
  const requestPermissions = useRequestPermissionsAction(installableViewItem);

  return {
    viewPublish,
    viewInMarketplaceHref: marketplaceListingUrl,
    viewShare,
    deleteExtension,
    deactivate,
    reactivate,
    viewLogs,
    activate,
    requestPermissions,
  };
}

export default useBlueprintsPageActions;
