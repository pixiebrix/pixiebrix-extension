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

import styles from "./ActiveSidebarModsListItem.module.scss";

import React, { useMemo } from "react";
import { ListGroup } from "react-bootstrap";
import { type PanelEntry } from "../../types/sidebarTypes";
import { useDispatch, useSelector } from "react-redux";
import sidebarSlice from "../../store/sidebar/sidebarSlice";
import { selectEventData } from "../../telemetry/deployments";
import reportEvent from "../../telemetry/reportEvent";
import { Events } from "../../telemetry/events";
import { eventKeyForEntry } from "../../store/sidebar/eventKeyUtils";
import { MOD_LAUNCHER } from "../../store/sidebar/constants";
import { splitStartingEmoji } from "../../utils/stringUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCube } from "@fortawesome/free-solid-svg-icons";
import { DEFAULT_TEXT_ICON_COLOR } from "../../icons/constants";
import MarketplaceListingIcon from "@/components/MarketplaceListingIcon";
import { type ActivatedModComponent } from "../../types/modComponentTypes";
import { selectModComponentFromEventKey } from "../sidebarSelectors";

/**
 * Returns the emoji icon and title for a given heading
 * @see useGetActionNameAndIcon
 */
function useSplitEmojiIcon(heading: string) {
  return useMemo(() => {
    const { startingEmoji, rest } = splitStartingEmoji(heading);
    return {
      title: rest.trim(), // Trim whitespace if there is any from the emoji split
      emojiIcon: startingEmoji,
    };
  }, [heading]);
}

const ActiveSidebarModsListItem: React.FunctionComponent<{
  panel: PanelEntry;
}> = ({ panel }) => {
  const dispatch = useDispatch();
  const eventKey = eventKeyForEntry(panel);
  const getModComponentFromEventKey = useSelector(
    selectModComponentFromEventKey,
  );
  const modComponent: ActivatedModComponent | undefined =
    getModComponentFromEventKey(eventKey);
  const { heading: originalHeading } = panel;
  const { title, emojiIcon } = useSplitEmojiIcon(originalHeading);

  const onClick = () => {
    reportEvent(Events.VIEW_SIDEBAR_PANEL, {
      ...selectEventData(modComponent),
      initialLoad: false,
      source: "modLauncher",
    });
    dispatch(sidebarSlice.actions.selectTab(eventKey));
    dispatch(sidebarSlice.actions.closeTab(eventKeyForEntry(MOD_LAUNCHER)));
  };

  // Start with basic default icon for mod components
  let icon: React.ReactNode = (
    <FontAwesomeIcon icon={faCube} color={DEFAULT_TEXT_ICON_COLOR} fixedWidth />
  );

  // Apply emoji icon or mod icon if available
  if (emojiIcon) {
    icon = emojiIcon;
  } else if (modComponent?.modMetadata) {
    icon = (
      <MarketplaceListingIcon
        packageId={modComponent.modMetadata.id}
        defaultIcon={faCube}
      />
    );
  }

  return (
    <ListGroup.Item className={styles.root} onClick={onClick}>
      <span className={styles.icon}>{icon}</span>
      <h5 className={styles.lineClampOneLine}>{title}</h5>
    </ListGroup.Item>
  );
};

export default ActiveSidebarModsListItem;
