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

import React, { useMemo } from "react";
import EllipsisMenu, {
  type EllipsisMenuItem,
} from "@/components/ellipsisMenu/EllipsisMenu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHammer,
  faList,
  faShare,
  faStore,
  faSyncAlt,
  faTimes,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import PublishIcon from "@/icons/arrow-up-from-bracket-solid.svg?loadAsComponent";
import { type ModViewItem } from "@/types/modTypes";
import { modModalsSlice } from "@/extensionConsole/pages/mods/modals/modModalsSlice";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { deactivateMod } from "@/store/deactivateModHelpers";
import useUserAction from "@/hooks/useUserAction";
import { useDeletePackageMutation } from "@/data/service/api";
import { useModals } from "@/components/ConfirmationModal";
import { CancelError } from "@/errors/businessErrors";
import { assertNotNullish } from "@/utils/nullishUtils";
import { UI_PATHS } from "@/data/service/urlPaths";
import useFindModInstance from "@/mods/hooks/useFindModInstance";
import { type AppDispatch } from "@/extensionConsole/store";

const ModsPageActions: React.FunctionComponent<{
  modViewItem: ModViewItem;
}> = ({ modViewItem }) => {
  const dispatch = useDispatch<AppDispatch>();
  const history = useHistory();
  const { showConfirmation } = useModals();
  const [deleteModPackage] = useDeletePackageMutation();

  const {
    modId,
    editablePackageId,
    name,
    marketplaceListingUrl,
    hasUpdate,
    modActions: {
      showPublishToMarketplace,
      showViewDetails,
      showShareWithTeams,
      showViewLogs,
      showEditInWorkshop,
      showReactivate,
      showDeactivate,
      showDelete,
    },
  } = modViewItem;

  const modInstance = useFindModInstance(modId);

  const deactivateModAction = useUserAction(
    async () => {
      assertNotNullish(modInstance, "Expected mod instance");

      reportEvent(Events.MOD_REMOVE, { modId });
      await dispatch(deactivateMod(modId, modInstance.modComponentIds));
    },
    {
      successMessage: `Deactivated mod: ${name}`,
      errorMessage: `Error deactivating mod: ${name}`,
    },
    [modId],
  );

  const deleteModAction = useUserAction(
    async () => {
      const isConfirmed = await showConfirmation({
        title: "Permanently Delete?",
        message: `Permanently delete the mod from the package registry: ${name}`,
        submitCaption: "Delete",
        cancelCaption: "Back to Safety",
      });

      if (!isConfirmed) {
        throw new CancelError();
      }

      assertNotNullish(
        editablePackageId,
        `Editable package id is missing for mod being deleted: ${modId}, something went wrong`,
      );

      await deleteModPackage({ id: editablePackageId }).unwrap();
    },
    {
      successMessage: `Deleted mod ${name} from the package registry`,
      errorMessage: `Error deleting mod ${name} from the package registry`,
      event: Events.PACKAGE_DELETE,
    },
    [name, editablePackageId],
  );

  const actionItems = useMemo(
    (): EllipsisMenuItem[] => [
      {
        title: "Publish to Marketplace",
        // Applying the same classes which <FontAwesomeIcon/> applies
        icon: <PublishIcon className="svg-inline--fa fa-w-16 fa-fw" />,
        action() {
          dispatch(modModalsSlice.actions.setPublishContext({ modId }));
        },
        hide: !showPublishToMarketplace,
      },
      {
        title: "View Mod Details",
        icon: <FontAwesomeIcon fixedWidth icon={faStore} />,
        href: marketplaceListingUrl,
        hide: !showViewDetails,
      },
      {
        title: "Share with Teams",
        icon: <FontAwesomeIcon fixedWidth icon={faShare} />,
        action() {
          dispatch(modModalsSlice.actions.setShareContext({ modId }));
        },
        hide: !showShareWithTeams,
      },
      {
        title: "View Logs",
        icon: <FontAwesomeIcon fixedWidth icon={faList} />,
        action() {
          dispatch(
            modModalsSlice.actions.setLogsContext({
              title: name,
              messageContext: {
                label: name,
                modId,
              },
            }),
          );
        },
        hide: !showViewLogs,
      },
      {
        title: "Edit in Workshop",
        icon: <FontAwesomeIcon fixedWidth icon={faHammer} />,
        action() {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Checked in the 'hide' input below
          history.push(UI_PATHS.WORKSHOP_BRICK(editablePackageId!));
        },
        hide: !showEditInWorkshop || !editablePackageId,
      },
      {
        title: hasUpdate ? "Update" : "Reactivate",
        icon: <FontAwesomeIcon fixedWidth icon={faSyncAlt} />,
        className: "text-info",
        action() {
          reportEvent(Events.START_MOD_ACTIVATE, {
            modId,
            screen: "extensionConsole",
            reinstall: true,
          });
          history.push(UI_PATHS.MOD_ACTIVATE(modId, true));
        },
        hide: !showReactivate,
      },
      {
        title: "Deactivate",
        icon: <FontAwesomeIcon fixedWidth icon={faTimes} />,
        className: "text-danger",
        action: deactivateModAction,
        hide: !showDeactivate,
      },
      {
        title: "Delete",
        icon: <FontAwesomeIcon fixedWidth icon={faTrash} />,
        className: "text-danger",
        action: deleteModAction,
        hide: !showDelete,
      },
    ],
    [
      deactivateModAction,
      deleteModAction,
      dispatch,
      hasUpdate,
      history,
      marketplaceListingUrl,
      modId,
      editablePackageId,
      name,
      showDeactivate,
      showDelete,
      showEditInWorkshop,
      showPublishToMarketplace,
      showReactivate,
      showShareWithTeams,
      showViewDetails,
      showViewLogs,
    ],
  );

  return <EllipsisMenu ariaLabel="mods-page-actions" items={actionItems} />;
};

export default ModsPageActions;
