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
import useModsPageActions from "@/extensionConsole/pages/mods/hooks/useModsPageActions";
import PublishIcon from "@/icons/arrow-up-from-bracket-solid.svg?loadAsComponent";
import { type ModViewItem } from "@/types/modTypes";

const ModsPageActions: React.FunctionComponent<{
  modViewItem: ModViewItem;
}> = ({ modViewItem }) => {
  const actions = useModsPageActions(modViewItem);

  const { marketplaceListingUrl, hasUpdate } = modViewItem;

  const actionItems = useMemo(
    (): EllipsisMenuItem[] => [
      {
        title: "Publish to Marketplace",
        // Applying the same classes which <FontAwesomeIcon/> applies
        icon: <PublishIcon className="svg-inline--fa fa-w-16 fa-fw" />,
        action: actions.viewPublish,
        hide: !actions.viewPublish,
      },
      {
        title: "View Mod Details",
        icon: <FontAwesomeIcon fixedWidth icon={faStore} />,
        href: marketplaceListingUrl,
        hide: marketplaceListingUrl == null,
      },
      {
        title: "Share with Teams",
        icon: <FontAwesomeIcon fixedWidth icon={faShare} />,
        action: actions.viewShare,
        hide: !actions.viewShare,
      },
      {
        title: "View Logs",
        icon: <FontAwesomeIcon fixedWidth icon={faList} />,
        action: actions.viewLogs,
        hide: !actions.viewLogs,
      },
      {
        title: "Edit in Workshop",
        icon: <FontAwesomeIcon fixedWidth icon={faHammer} />,
        action: actions.editInWorkshop,
        hide: !actions.editInWorkshop,
      },
      {
        title: hasUpdate ? "Update" : "Reactivate",
        icon: <FontAwesomeIcon fixedWidth icon={faSyncAlt} />,
        className: "text-info",
        action: actions.reactivate,
        hide: !actions.reactivate,
      },
      {
        title: "Deactivate",
        icon: <FontAwesomeIcon fixedWidth icon={faTimes} />,
        className: "text-danger",
        action: actions.deactivate,
        hide: !actions.deactivate,
      },
      {
        title: "Delete",
        icon: <FontAwesomeIcon fixedWidth icon={faTrash} />,
        className: "text-danger",
        action: actions.delete,
        hide: !actions.delete,
      },
    ],
    [actions, hasUpdate],
  );

  return <EllipsisMenu ariaLabel="mods-page-actions" items={actionItems} />;
};

export default ModsPageActions;
