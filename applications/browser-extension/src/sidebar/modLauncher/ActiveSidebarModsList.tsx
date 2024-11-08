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
import styles from "./ActiveSidebarModsList.module.scss";

import React, { useMemo } from "react";
import { ListGroup } from "react-bootstrap";
import { type Column, useTable } from "react-table";
import ActiveSidebarModsListItem from "./ActiveSidebarModsListItem";
import { isEmpty, sortBy } from "lodash";
import workshopIllustration from "../../../img/workshop.svg";

import { MARKETPLACE_URL } from "../../urlConstants";
import { type PanelEntry } from "../../types/sidebarTypes";
import { useSelector } from "react-redux";
import { selectSidebarPanels } from "../sidebarSelectors";
import useIsEnterpriseUser from "../../hooks/useIsEnterpriseUser";
import { splitStartingEmoji } from "../../utils/stringUtils";

const columns: Array<Column<PanelEntry>> = [
  {
    Header: "Name",
    accessor: "heading",
  },
];

const EnterpriseNoActiveSidebarPanelsView: React.FunctionComponent = () => (
  <div className={styles.emptyViewRoot}>
    <div>
      <h4>We didn&apos;t find any mods to run</h4>
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
        Please contact your team administrator if a mod you were expecting is
        not available.
      </p>
    </div>
  </div>
);

const PublicNoActiveSidebarPanelsView: React.FunctionComponent = () => (
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
      Check out the <a href={MARKETPLACE_URL}>PixieBrix Marketplace</a>
    </p>
  </div>
);

const NoActiveSidebarPanelsView: React.FunctionComponent = () => {
  const isEnterpriseUser = useIsEnterpriseUser();
  return isEnterpriseUser ? (
    <EnterpriseNoActiveSidebarPanelsView />
  ) : (
    <PublicNoActiveSidebarPanelsView />
  );
};

export const ActiveSidebarModsList: React.FunctionComponent = () => {
  const sidebarPanels = useSelector(selectSidebarPanels);

  const sortedSidebarPanels = useMemo(
    () =>
      sortBy(sidebarPanels, (panel) =>
        splitStartingEmoji(panel.heading).rest.trim(),
      ),
    [sidebarPanels],
  );

  const tableInstance = useTable<PanelEntry>({
    columns,
    data: sortedSidebarPanels,
  });

  if (isEmpty(sidebarPanels)) {
    return <NoActiveSidebarPanelsView />;
  }

  return (
    <ListGroup
      {...tableInstance.getTableProps()}
      className="flex-grow scrollable-area"
    >
      {tableInstance.rows.map((row) => {
        tableInstance.prepareRow(row);
        return (
          <ActiveSidebarModsListItem
            key={row.original.modComponentRef.modComponentId}
            panel={row.original}
          />
        );
      })}
    </ListGroup>
  );
};
