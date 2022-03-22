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

import EllipsisMenu from "@/components/ellipsisMenu/EllipsisMenu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDownload,
  faList,
  faShare,
  faSyncAlt,
  faTimes,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import React, { useMemo } from "react";
import useInstallableActions from "@/options/pages/blueprints/useInstallableActions";
import { InstallableViewItem } from "./blueprintsTypes";
import { appApi } from "@/services/api";
import { useSelector } from "react-redux";

const BlueprintActions: React.FunctionComponent<{
  installableViewItem: InstallableViewItem;
}> = ({ installableViewItem }) => {
  // Select cached auth data for performance reasons
  const {
    data: { flags },
  } = useSelector(appApi.endpoints.getAuth.select());

  const { installable, hasUpdate, status, sharing } = installableViewItem;
  const actions = useInstallableActions(installable);
  const isCloudExtension =
    sharing.source.type === "Personal" && status !== "Active";

  const actionItems = useMemo(
    () => [
      {
        title: (
          <>
            <FontAwesomeIcon icon={faShare} /> Share
          </>
        ),
        action: actions.viewShare,
        hide: !actions.viewShare || isCloudExtension,
      },
      {
        title: (
          <>
            <FontAwesomeIcon icon={faDownload} /> Export
          </>
        ),
        action: actions.exportBlueprint,
      },
      {
        title: (
          <>
            <FontAwesomeIcon icon={faList} /> View Logs
          </>
        ),
        action: actions.viewLogs,
        hide: status !== "Active",
      },
      {
        title: (
          <>
            {hasUpdate ? (
              <span className="text-info">
                <FontAwesomeIcon icon={faSyncAlt} /> Update
              </span>
            ) : (
              <>
                <FontAwesomeIcon icon={faSyncAlt} /> Reactivate
              </>
            )}
          </>
        ),
        action: actions.reinstall,
        // Managed extensions are updated via the deployment banner
        hide:
          actions.reinstall === null ||
          sharing.source.type === "Deployment" ||
          status === "Inactive",
      },
      {
        title: (
          <>
            <FontAwesomeIcon icon={faTimes} /> Deactivate
          </>
        ),
        action: actions.uninstall,
        // TODO: shift all hide logic to useInstallableActions
        hide:
          status !== "Active" ||
          (sharing.source.type === "Deployment" &&
            flags.includes("restricted-uninstall")),
        className: "text-danger",
      },
      {
        title: (
          <span className="text-danger">
            <FontAwesomeIcon icon={faTrash} /> Delete
          </span>
        ),
        action: actions.deleteExtension,
        hide: !isCloudExtension,
        className: "text-danger",
      },
    ],
    [actions, flags, hasUpdate, isCloudExtension, sharing.source.type, status]
  );

  return <EllipsisMenu items={actionItems} />;
};

export default BlueprintActions;
