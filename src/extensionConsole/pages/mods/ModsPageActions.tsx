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
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { deactivateMod } from "@/store/deactivateUtils";
import { selectModComponentsForMod } from "@/store/modComponents/modComponentSelectors";
import useUserAction from "@/hooks/useUserAction";
import { useDeletePackageMutation } from "@/data/service/api";
import { useModals } from "@/components/ConfirmationModal";
import { CancelError } from "@/errors/businessErrors";

const ModsPageActions: React.FunctionComponent<{
  modViewItem: ModViewItem;
}> = ({ modViewItem }) => {
  const dispatch = useDispatch();
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

  const modComponents = useSelector(selectModComponentsForMod(modId));

  const deactivateModAction = useUserAction(
    async () => {
      reportEvent(Events.MOD_REMOVE, { modId });
      await deactivateMod(modId, modComponents, dispatch);
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
          history.push(`/workshop/bricks/${modId}`);
        },
        hide: !showEditInWorkshop,
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
          history.push(
            `marketplace/activate/${encodeURIComponent(modId)}?reinstall=1`,
          );
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
