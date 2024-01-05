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

import styles from "@/sidebar/modLauncher/ActiveSidebarModsListItem.module.scss";

import React, { useMemo } from "react";
import { ListGroup } from "react-bootstrap";
import { DEFAULT_TEXT_ICON_COLOR } from "@/mods/ModIcon";
import { type PanelEntry } from "@/types/sidebarTypes";
import { useDispatch, useSelector } from "react-redux";
import sidebarSlice from "@/sidebar/sidebarSlice";
import { selectEventData } from "@/telemetry/deployments";
import reportEvent from "@/telemetry/reportEvent";
import { selectExtensionFromEventKey } from "@/sidebar/sidebarSelectors";
import { Events } from "@/telemetry/events";
import { eventKeyForEntry } from "@/sidebar/eventKeyUtils";
import { MOD_LAUNCHER } from "@/sidebar/modLauncher/constants";
import { splitStartingEmoji } from "@/utils/stringUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCube } from "@fortawesome/free-solid-svg-icons";
import DelayedRender from "@/components/DelayedRender";
import type { UnresolvedModComponent } from "@/types/modComponentTypes";

/**
 * Returns the emoji icon and title for a given heading
 * @see useGetActionNameAndIcon
 */
function useEmojiIcon(heading: string) {
  return useMemo(() => {
    const { startingEmoji, rest } = splitStartingEmoji(heading);
    return {
      title: rest.trim(), // Trim whitespace if there is any from the emoji split
      emojiIcon: startingEmoji,
    };
  }, [heading]);
}

/**
 * Default icon for when mod is not provided for an entry.
 * @constructor
 */
const DelayedDefaultIcon: React.FunctionComponent = () => (
  // Apply a delay so there's no flash if/when the mod is passed through
  <DelayedRender millis={600}>
    <FontAwesomeIcon
      icon={faCube}
      color={DEFAULT_TEXT_ICON_COLOR}
      size="1x"
      fixedWidth
    />
  </DelayedRender>
);

const ActiveSidebarModsListItem: React.FunctionComponent<{
  modComponent?: UnresolvedModComponent;
  panel: PanelEntry;
}> = ({ modComponent, panel }) => {
  const dispatch = useDispatch();
  const getModComponentFromEventKey = useSelector(selectExtensionFromEventKey);
  const { heading: originalHeading } = panel;
  const { title, emojiIcon } = useEmojiIcon(originalHeading);

  const onClick = () => {
    const eventKey = eventKeyForEntry(panel);
    reportEvent(Events.VIEW_SIDEBAR_PANEL, {
      ...selectEventData(getModComponentFromEventKey(eventKey)),
      initialLoad: false,
      source: "modLauncher",
    });
    dispatch(sidebarSlice.actions.selectTab(eventKey));
    dispatch(sidebarSlice.actions.closeTab(eventKeyForEntry(MOD_LAUNCHER)));
  };

  let icon: React.ReactNode = (
    // Use DelayedDefaultIcon instead of passing null to ModIcon because ModIcon does not support a null mod argument.
    // Having the caller decide how to handle the null mod case provides freedom of choosing the default icon
    // based on the calling context, e.g., single vs. multiple block icon
    <div className={styles.defaultIcon}>
      <DelayedDefaultIcon />
    </div>
  );

  // Prefer emoji icon over mod icon
  if (emojiIcon) {
    icon = <div className={styles.emojiIcon}>{emojiIcon}</div>;
  } else if (modComponent) {
    // TODO: refactor ModIcon to support passing packageId and fallback icon
    // icon = (
    //   <div className={styles.modIcon}>
    //     <ModIcon mod={mod} />
    //   </div>
    // );
  }

  return (
    <ListGroup.Item className={styles.root} onClick={onClick}>
      {icon}
      <h5 className={styles.lineClampOneLine}>{title}</h5>
    </ListGroup.Item>
  );
};

export default ActiveSidebarModsListItem;
