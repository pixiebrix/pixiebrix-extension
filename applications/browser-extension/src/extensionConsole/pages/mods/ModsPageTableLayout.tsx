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

import styles from "./ModsPageTableLayout.module.scss";
import React, { useMemo } from "react";
import {
  type Column,
  type Row,
  useFilters,
  useGlobalFilter,
  useGroupBy,
  useSortBy,
  useTable,
} from "react-table";
import ModsPageSidebar from "./ModsPageSidebar";
import {
  selectActiveTab,
  selectGroupBy,
  selectModViewItems,
  selectSearchQuery,
  selectSortBy,
} from "./modsPageSelectors";
import { useSelector } from "react-redux";
import { sortBy as _lodashSortBy, uniq } from "lodash";
import AutoSizer, { type Size } from "react-virtualized-auto-sizer";
import ModsPageToolbar from "./ModsPageToolbar";
import ModsPageContent from "./ModsPageContent";
import type { ModViewItem } from "../../../types/modTypes";

const statusFilter = (
  rows: Array<Row<ModViewItem>>,
  _: string[],
  filterValue: string,
) => {
  // For UX purposes, Paused deployments will be included under the "Active" filter
  const filterValues = [
    filterValue,
    ...(filterValue === "Active" ? ["Paused"] : []),
  ];

  return rows.filter((row) => filterValues.includes(row.original.status));
};

// These react-table columns aren't rendered as column headings,
// but used to expose grouping, sorting, filtering, and global
// searching utilities on ModViewItems
const columns: Array<Column<ModViewItem>> = [
  {
    Header: "Name",
    accessor: "name",
    disableGroupBy: true,
    disableFilters: true,
  },
  {
    Header: "Description",
    accessor: "description",
    disableGroupBy: true,
    disableFilters: true,
    disableSortBy: true,
  },
  {
    Header: "Package ID",
    accessor: "modId",
    disableGroupBy: true,
    disableFilters: true,
    disableSortBy: true,
  },
  {
    Header: "Source",
    // @ts-expect-error -- react-table allows nested accessors
    accessor: "sharingSource.label",
    disableGlobalFilter: true,
  },
  {
    Header: "Last updated",
    accessor: "updatedAt",
    disableGroupBy: true,
    disableFilters: true,
    disableGlobalFilter: true,
    sortInverted: true,
  },
  {
    Header: "Status",
    accessor: "status",
    disableGlobalFilter: true,
    filter: statusFilter,
  },
];

const ModsPageTableLayout: React.FC = () => {
  const modViewItems = useSelector(selectModViewItems);

  const teamFilters = useMemo(
    () =>
      _lodashSortBy(
        uniq(
          modViewItems.map(({ sharingSource }) => sharingSource.label),
        ).filter((label) => label !== "Public" && label !== "Personal"),
      ),
    [modViewItems],
  );

  const groupBy = useSelector(selectGroupBy);
  const sortBy = useSelector(selectSortBy);
  const activeTab = useSelector(selectActiveTab);
  const searchQuery = useSelector(selectSearchQuery);

  const tableInstance = useTable<ModViewItem>(
    {
      columns,
      data: modViewItems,
      initialState: {
        groupBy,
        sortBy,
        filters: activeTab.filters,
        globalFilter: searchQuery,
      },
      useControlledState: (state) =>
        useMemo(
          () => ({
            ...state,
            groupBy,
            sortBy,
            filters: activeTab.filters,
            globalFilter: searchQuery,
          }),
          // eslint-disable-next-line react-hooks/exhaustive-deps -- table props are required dependencies
          [searchQuery, state, groupBy, sortBy, activeTab.filters],
        ),
    },
    useFilters,
    useGlobalFilter,
    useGroupBy,
    useSortBy,
  );

  return (
    <div className={styles.root}>
      <ModsPageSidebar
        teamFilters={teamFilters}
        tableInstance={tableInstance}
      />
      <div className={styles.mainContainer}>
        <ModsPageToolbar tableInstance={tableInstance} />
        {/* This wrapper prevents AutoSizer overflow in a flex box container */}
        <div style={{ flex: "1 1 auto" }}>
          <AutoSizer defaultHeight={500}>
            {({ height, width }: Size) => (
              <ModsPageContent
                tableInstance={tableInstance}
                width={width}
                height={height}
              />
            )}
          </AutoSizer>
        </div>
      </div>
    </div>
  );
};

export default ModsPageTableLayout;
