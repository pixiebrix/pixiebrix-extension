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
import styles from "@/sidebar/modLauncher/ActiveSidebarModsList.module.scss";

import React from "react";
import { type Mod, type ModViewItem } from "@/types/modTypes";
import { ListGroup, Row } from "react-bootstrap";
import useModViewItems from "@/mods/useModViewItems";
import { type Column, useTable } from "react-table";
import Loader from "@/components/Loader";
import { ActiveSidebarModsListItem } from "@/sidebar/modLauncher/ActiveSidebarModsListItem";
import { isEmpty } from "lodash";
import workshopIllustration from "@img/workshop.svg";

import { MARKETPLACE_URL } from "@/urlConstants";
import { type PanelEntry } from "@/types/sidebarTypes";
import { useSelector } from "react-redux";
import { selectSidebarPanels } from "@/sidebar/sidebarSelectors";
import {
  isModDefinition,
  isResolvedModComponent,
  isUnavailableMod,
} from "@/utils/modUtils";

const columns: Array<Column<PanelEntry>> = [
  {
    Header: "Name",
    accessor: "heading",
  },
];

const NoActiveSidebarPanelsView: React.FunctionComponent = () => (
  <div className={styles.emptyViewRoot}>
    <div>
      <p>We didn&apos;t find any mods to run</p>
      <h4>Don&apos;t worry, there&apos;s a solution</h4>
      <img
        src={workshopIllustration}
        className={styles.illustration}
        alt="Workshop"
      />
      <p>
        Some mods don&apos;t run on every page.
        <br />
        And other mods don&apos;t run in the Sidebar.
        <br />
        <br />
        Check that the mod is configured correctly.
      </p>
    </div>
    <p>
      Looking for new mods?
      <br />
      Check out the{" "}
      <a href={MARKETPLACE_URL} target="_blank" rel="noopener noreferrer">
        PixieBrix Marketplace
      </a>
    </p>
  </div>
);

function getModViewItemForPanel(
  modViewItems: ModViewItem[],
  panel: PanelEntry
): ModViewItem | null {
  return (
    modViewItems.find(({ mod }) => {
      if (isUnavailableMod(mod)) {
        return false;
      }

      if (isModDefinition(mod) && "id" in mod) {
        return mod.id === panel.blueprintId;
      }

      if (isResolvedModComponent(mod)) {
        return mod.id === panel.extensionId;
      }

      return false;
    }) ?? null
  );
}

export const ActiveSidebarModsList: React.FunctionComponent<{
  mods: Mod[];
}> = ({ mods }) => {
  const { modViewItems, isLoading } = useModViewItems(mods);
  const sidebarPanels = useSelector(selectSidebarPanels);

  const activeMods = modViewItems.filter(
    (modViewItem) => modViewItem.status === "Active" && !modViewItem.unavailable
  );

  const tableInstance = useTable<PanelEntry>({
    columns,
    data: sidebarPanels,
  });

  const renderBody = isEmpty(sidebarPanels) ? (
    <NoActiveSidebarPanelsView />
  ) : (
    <Row>
      <ListGroup {...tableInstance.getTableProps()} className="flex-grow">
        {tableInstance.rows.map((row) => {
          tableInstance.prepareRow(row);
          const { mod } =
            getModViewItemForPanel(activeMods, row.original) ?? {};

          return (
            <ActiveSidebarModsListItem
              key={row.original.extensionId}
              panel={row.original}
              mod={mod}
            />
          );
        })}
      </ListGroup>
    </Row>
  );

  return isLoading ? <Loader /> : renderBody;
};

export default ActiveSidebarModsList;
