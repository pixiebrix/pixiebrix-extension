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

import useActivateAction from "@/extensionConsole/pages/mods/hooks/useActivateAction";
import useViewPublishAction from "@/extensionConsole/pages/mods/hooks/useViewPublishAction";
import useViewShareAction from "@/extensionConsole/pages/mods/hooks/useViewShareAction";
import useReactivateAction from "@/extensionConsole/pages/mods/hooks/useReactivateAction";
import { type ModViewItem } from "@/types/modTypes";
import useRequestPermissionsAction from "@/mods/hooks/useRequestPermissionsAction";
import useViewLogsAction from "@/extensionConsole/pages/mods/hooks/useViewLogsAction";
import useDeactivateAction from "@/mods/hooks/useDeactivateAction";
import useDeleteModDefinitionAction from "@/mods/hooks/useDeleteModDefinitionAction";
import useEditInWorkshopAction from "@/mods/hooks/useEditInWorkshopAction";

type ActionCallback = () => void;

export type ModsPageActions = {
  reactivate: ActionCallback | null;
  activate: ActionCallback | null;
  viewPublish: ActionCallback | null;
  viewShare: ActionCallback | null;
  delete: ActionCallback | null;
  editInWorkshop: ActionCallback | null;
  deactivate: ActionCallback | null;
  viewLogs: ActionCallback | null;
  requestPermissions: ActionCallback | null;
};

function useModsPageActions(modViewItem: ModViewItem): ModsPageActions {
  const viewPublish = useViewPublishAction(modViewItem);
  const viewShare = useViewShareAction(modViewItem);
  const reactivate = useReactivateAction(modViewItem);
  const viewLogs = useViewLogsAction(modViewItem);
  const activate = useActivateAction(modViewItem);
  const deactivate = useDeactivateAction(modViewItem);
  const deleteMod = useDeleteModDefinitionAction(modViewItem);
  const requestPermissions = useRequestPermissionsAction(modViewItem);
  const editInWorkshop = useEditInWorkshopAction(modViewItem);

  return {
    viewPublish,
    viewShare,
    editInWorkshop,
    delete: deleteMod,
    deactivate,
    reactivate,
    viewLogs,
    activate,
    requestPermissions,
  };
}

export default useModsPageActions;
