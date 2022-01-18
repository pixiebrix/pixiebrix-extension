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

import {
  Installable,
  isExtension,
} from "@/options/pages/blueprints/installableUtils";
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

const BlueprintActions: React.FunctionComponent<{
  installable: Installable;
}> = ({ installable }) => {
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
          {
            title: (
              <>
                <FontAwesomeIcon icon={faShare} /> Share
              </>
            ),
            hide: !isExtension(installable),
            action: viewShare,
          },
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
          },
          ...(reinstall
            ? [
                {
                  title: (
                    <>
                      {/* TODO: add update */}
                      <FontAwesomeIcon icon={faSyncAlt} /> Reactivate
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
            className: "text-danger",
          },
        ]}
      />
    </>
  );
};

export default BlueprintActions;
