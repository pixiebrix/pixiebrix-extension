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
} from "@fortawesome/free-solid-svg-icons";
import React from "react";
import useInstallableActions from "@/options/pages/blueprints/useInstallableActions";
import { InstallableViewItem } from "./blueprintsTypes";
import { isPersonal } from "@/options/pages/blueprints/installableUtils";

const BlueprintActions: React.FunctionComponent<{
  installableViewItem: InstallableViewItem;
}> = ({ installableViewItem }) => {
  const { installable, hasUpdate, status, sharing } = installableViewItem;
  const {
    remove,
    viewLogs,
    // TODO: consistent naming
    onExportBlueprint,
    viewShare,
    reinstall,
  } = useInstallableActions(installable);

  return (
    <>
      <EllipsisMenu
        items={[
          ...(viewShare
            ? [
                {
                  title: (
                    <>
                      <FontAwesomeIcon icon={faShare} /> Share
                    </>
                  ),
                  action: viewShare,
                  hide:
                    sharing.source.type === "Personal" && status !== "Active",
                },
              ]
            : []),
          {
            title: (
              <>
                <FontAwesomeIcon icon={faDownload} /> Export
              </>
            ),
            action: onExportBlueprint,
          },
          {
            title: (
              <>
                <FontAwesomeIcon icon={faList} /> View Logs
              </>
            ),
            action: viewLogs,
            hide: status !== "Active",
          },
          ...(reinstall
            ? [
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
                  action: reinstall,
                  // Managed extensions are updated via the deployment banner
                  // hide: managed,
                },
              ]
            : []),
          {
            title: (
              <>
                <FontAwesomeIcon icon={faTimes} /> Uninstall
              </>
            ),
            action: remove,
            hide: status !== "Active",
            className: "text-danger",
          },
        ]}
      />
    </>
  );
};

export default BlueprintActions;
