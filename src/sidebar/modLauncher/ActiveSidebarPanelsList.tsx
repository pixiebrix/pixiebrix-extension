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
import styles from "@/sidebar/modLauncher/ActiveModsList.module.scss";

import React from "react";
import { type Mod, type ModViewItem } from "@/types/modTypes";
import { ListGroup, Row } from "react-bootstrap";
import useModViewItems from "@/mods/useModViewItems";
import { type Column, useTable } from "react-table";
import Loader from "@/components/Loader";
import { ActiveSidebarPanelsListItem } from "@/sidebar/modLauncher/ActiveSidebarPanelsListItem";
import { isEmpty } from "lodash";
import workshopIllustration from "@img/workshop.svg";

import { MARKETPLACE_URL } from "@/urlConstants";
import { type PanelEntry } from "@/types/sidebarTypes";
import { useSelector } from "react-redux";
import { selectSidebarPanels } from "@/sidebar/sidebarSelectors";
import { isModDefinition, isResolvedModComponent } from "@/utils/modUtils";

const columns: Array<Column<PanelEntry>> = [
  {
    Header: "Name",
    accessor: "heading",
  },
];

const NoActiveSidebarPanelsView: React.FunctionComponent = () => (
  <div className={styles.emptyViewRoot}>
    <p>You don&apos;t have any mods activated</p>
    <h4>But we have a solution for that</h4>
    <img
      src={workshopIllustration}
      className={styles.illustration}
      alt="Workshop"
    />
    <p>
      There are hundreds of mods to use on the{" "}
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

export const ActiveSidebarPanelsList: React.FunctionComponent<{
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

  const renderBody = isEmpty(activeMods) ? (
    <NoActiveSidebarPanelsView />
  ) : (
    <>
      <h3 className={styles.activeModsHeading}>Active mods</h3>
      <Row>
        <ListGroup {...tableInstance.getTableProps()} className="flex-grow">
          {tableInstance.rows.map((row) => {
            tableInstance.prepareRow(row);
            const { mod } =
              getModViewItemForPanel(activeMods, row.original) ?? {};

            return (
              <ActiveSidebarPanelsListItem
                key={row.original.extensionId}
                panel={row.original}
                mod={mod}
              />
            );
          })}
        </ListGroup>
      </Row>
    </>
  );

  return isLoading ? <Loader /> : renderBody;
};

export default ActiveSidebarPanelsList;
