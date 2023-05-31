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

import useActivateAction from "@/extensionConsole/pages/mods/hooks/useActivateAction";
import useViewPublishAction from "@/extensionConsole/pages/mods/hooks/useViewPublishAction";
import useMarketplaceUrl from "@/mods/hooks/useMarketplaceUrl";
import useViewShareAction from "@/extensionConsole/pages/mods/hooks/useViewShareAction";
import useDeleteExtensionAction from "@/mods/hooks/useDeleteExtensionAction";
import useReactivateAction from "@/extensionConsole/pages/mods/hooks/useReactivateAction";
import { type ModViewItem } from "@/mods/modTypes";
import useRequestPermissionsAction from "@/mods/hooks/useRequestPermissionsAction";
import useViewLogsAction from "@/extensionConsole/pages/mods/hooks/useViewLogsAction";
import useDeactivateAction from "@/mods/hooks/useDeactivateAction";

type ActionCallback = () => void;

export type ModActions = {
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

function useModViewItemActions(modViewItem: ModViewItem): ModActions {
  const marketplaceListingUrl = useMarketplaceUrl(modViewItem);
  const viewPublish = useViewPublishAction(modViewItem);
  const viewShare = useViewShareAction(modViewItem);
  const reactivate = useReactivateAction(modViewItem);
  const viewLogs = useViewLogsAction(modViewItem);
  const activate = useActivateAction(modViewItem);
  const deactivate = useDeactivateAction(modViewItem);
  const deleteExtension = useDeleteExtensionAction(modViewItem);
  const requestPermissions = useRequestPermissionsAction(modViewItem);

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

export default useModViewItemActions;
