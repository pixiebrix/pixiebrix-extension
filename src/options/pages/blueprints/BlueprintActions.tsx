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

import { Installable } from "@/options/pages/blueprints/installableUtils";
import EllipsisMenu from "@/components/ellipsisMenu/EllipsisMenu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faList, faTimes } from "@fortawesome/free-solid-svg-icons";
import React from "react";
import useInstallableActions from "@/options/pages/blueprints/useInstallableActions";
import ExtensionLogsModal from "@/options/pages/installed/ExtensionLogsModal";
import { useSelector } from "react-redux";
import { RootState } from "@/options/store";
import { LogsContext } from "@/options/pages/installed/installedPageSlice";
import { selectShowLogsContext } from "@/options/pages/installed/installedPageSelectors";

const BlueprintActions: React.FunctionComponent<{
  installable: Installable;
}> = ({ installable }) => {
  const { remove, viewLogs } = useInstallableActions(installable);

  return (
    <>
      <EllipsisMenu
        items={[
          {
            title: (
              <>
                <FontAwesomeIcon icon={faList} /> View Logs
              </>
            ),
            action: viewLogs,
          },
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
