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

import React from "react";
import { type Mod } from "@/types/modTypes";
import { ListGroup } from "react-bootstrap";
import ModIcon from "@/mods/ModIcon";
import { type PanelEntry } from "@/types/sidebarTypes";
import { useDispatch, useSelector } from "react-redux";
import sidebarSlice from "@/sidebar/sidebarSlice";
import { selectEventData } from "@/telemetry/deployments";
import reportEvent from "@/telemetry/reportEvent";
import { selectExtensionFromEventKey } from "@/sidebar/sidebarSelectors";
import { Events } from "@/telemetry/events";
import { eventKeyForEntry } from "@/sidebar/eventKeyUtils";
import cx from "classnames";
import { MOD_LAUNCHER } from "@/sidebar/modLauncher/constants";

export const ActiveSidebarModsListItem: React.FunctionComponent<{
  mod?: Mod;
  panel: PanelEntry;
}> = ({ mod, panel }) => {
  const dispatch = useDispatch();
  const getModComponentFromEventKey = useSelector(selectExtensionFromEventKey);
  const { heading } = panel;

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

  return (
    <ListGroup.Item className={styles.root} onClick={onClick}>
      <div className={cx(styles.icon, { [styles.noIcon]: !mod })}>
        {Boolean(mod) && <ModIcon mod={mod} />}
      </div>
      <h5 className={styles.lineClampOneLine}>{heading}</h5>
    </ListGroup.Item>
  );
};

export default ActiveSidebarModsListItem;
