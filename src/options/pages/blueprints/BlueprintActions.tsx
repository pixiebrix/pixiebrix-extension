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
import useInstallableViewItemActions from "@/options/pages/blueprints/useInstallableViewItemActions";
import { InstallableViewItem } from "./blueprintsTypes";

const BlueprintActions: React.FunctionComponent<{
  installableViewItem: InstallableViewItem;
}> = ({ installableViewItem }) => {
  const actions = useInstallableViewItemActions(installableViewItem);

  const { hasUpdate } = installableViewItem;

  const actionItems = useMemo(
    () => [
      {
        title: (
          <>
            <FontAwesomeIcon icon={faShare} /> Share
          </>
        ),
        action: actions.viewShare,
        hide: !actions.viewShare,
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
        hide: !actions.viewLogs,
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
        hide: !actions.reinstall,
      },
      {
        title: (
          <>
            <FontAwesomeIcon icon={faTimes} /> Deactivate
          </>
        ),
        action: actions.uninstall,
        hide: !actions.uninstall,
        className: "text-danger",
      },
      {
        title: (
          <span className="text-danger">
            <FontAwesomeIcon icon={faTrash} /> Delete
          </span>
        ),
        action: actions.deleteExtension,
        hide: !actions.deleteExtension,
        className: "text-danger",
      },
    ],
    [actions, hasUpdate]
  );

  return <EllipsisMenu items={actionItems} />;
};

export default BlueprintActions;
