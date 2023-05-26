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

import React, { useMemo } from "react";
import EllipsisMenu, {
  type EllipsisMenuItem,
} from "@/components/ellipsisMenu/EllipsisMenu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faList,
  faShare,
  faStore,
  faSyncAlt,
  faTimes,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import useInstallableViewItemActions from "@/installables/useInstallableViewItemActions";
import { type InstallableViewItem } from "./installableTypes";
import PublishIcon from "@/icons/arrow-up-from-bracket-solid.svg?loadAsComponent";

const InstallableActions: React.FunctionComponent<{
  installableViewItem: InstallableViewItem;
}> = ({ installableViewItem }) => {
  const actions = useInstallableViewItemActions(installableViewItem);

  const { hasUpdate } = installableViewItem;

  const actionItems = useMemo(
    (): EllipsisMenuItem[] => [
      {
        title: (
          <>
            {/* Applying the same classes which <FontAwesomeIcon/> applies */}
            <PublishIcon className="svg-inline--fa fa-w-16 fa-fw" /> Publish to
            Marketplace
          </>
        ),
        action: actions.viewPublish,
        hide: !actions.viewPublish,
      },
      {
        title: (
          <>
            <FontAwesomeIcon fixedWidth icon={faStore} /> View Mod Details
          </>
        ),
        href: actions.viewInMarketplaceHref,
        hide: !actions.viewInMarketplaceHref,
      },
      {
        title: (
          <>
            <FontAwesomeIcon fixedWidth icon={faShare} /> Share with Teams
          </>
        ),
        action: actions.viewShare,
        hide: !actions.viewShare,
      },
      {
        title: (
          <>
            <FontAwesomeIcon fixedWidth icon={faList} /> View Logs
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
                <FontAwesomeIcon fixedWidth icon={faSyncAlt} /> Update
              </span>
            ) : (
              <>
                <FontAwesomeIcon fixedWidth icon={faSyncAlt} /> Reactivate
              </>
            )}
          </>
        ),
        action: actions.reactivate,
        hide: !actions.reactivate,
      },
      {
        title: (
          <>
            <FontAwesomeIcon fixedWidth icon={faTimes} /> Deactivate
          </>
        ),
        action: actions.deactivate,
        hide: !actions.deactivate,
        className: "text-danger",
      },
      {
        title: (
          <span className="text-danger">
            <FontAwesomeIcon fixedWidth icon={faTrash} /> Delete
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

export default InstallableActions;
