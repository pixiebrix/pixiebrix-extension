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

import styles from "@/sidebar/modLauncher/ActiveSidebarPanelsListItem.module.scss";

import React from "react";
import { type Mod } from "@/types/modTypes";
import { ListGroup } from "react-bootstrap";
import ModIcon from "@/mods/ModIcon";
import { type PanelEntry } from "@/types/sidebarTypes";

export const ActiveSidebarPanelsListItem: React.FunctionComponent<{
  mod?: Mod;
  panel: PanelEntry;
}> = ({ mod, panel }) => {
  const { heading } = panel;

  return (
    <ListGroup.Item className={styles.root}>
      <div className={styles.mainContent}>
        <div className={styles.icon}>
          <ModIcon mod={mod} />
        </div>
        <div>
          <h5 className={styles.lineClampOneLine}>{heading}</h5>
        </div>
      </div>
    </ListGroup.Item>
  );
};

export default ActiveSidebarPanelsListItem;
