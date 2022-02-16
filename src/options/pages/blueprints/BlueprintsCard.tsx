/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import styles from "./BlueprintsCard.module.scss";

import { Button, Col, Row as BootstrapRow } from "react-bootstrap";
import React, { Fragment, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Column,
  useFilters,
  useGlobalFilter,
  useGroupBy,
  useSortBy,
  useTable,
} from "react-table";
import Select from "react-select";
import {
  faList,
  faSortAmountDownAlt,
  faSortAmountUpAlt,
  faThLarge,
} from "@fortawesome/free-solid-svg-icons";
import ListView from "./listView/ListView";
import ListFilters from "./ListFilters";
import { Installable, InstallableViewItem } from "./blueprintsTypes";
import GridView from "./gridView/GridView";
import useReduxState from "@/hooks/useReduxState";
import {
  selectFilters,
  selectGroupBy,
  selectSortBy,
  selectView,
} from "./blueprintsSelectors";
import blueprintsSlice from "./blueprintsSlice";
import { useSelector } from "react-redux";
import { uniq } from "lodash";
import useInstallableViewItems from "@/options/pages/blueprints/useInstallableViewItems";
import AutoSizer from "react-virtualized-auto-sizer";

// These react-table columns aren't rendered as column headings,
// but used to expose grouping, sorting, filtering, and global
// searching utilities on InstallableRows
const columns: Array<Column<InstallableViewItem>> = [
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
    // @ts-expect-error -- react-table allows nested accessors
    accessor: "sharing.packageId",
    disableGroupBy: true,
    disableFilters: true,
    disableSortBy: true,
  },
  {
    Header: "Sharing",
    // @ts-expect-error -- react-table allows nested accessors
    accessor: "sharing.source.label",
    disableGlobalFilter: true,
  },
  {
    Header: "Last modified",
    accessor: "updatedAt",
    disableGroupBy: true,
    disableFilters: true,
    disableGlobalFilter: true,
  },
  {
    Header: "Status",
    accessor: "status",
    disableGlobalFilter: true,
  },
];

const BlueprintsCard: React.FunctionComponent<{
  installables: Installable[];
}> = ({ installables }) => {
  const data = useInstallableViewItems(installables);

  const teamFilters = useMemo(
    () =>
      uniq(data.map((installable) => installable.sharing.source.label)).filter(
        (label) => label !== "Public" && label !== "Personal"
      ),
    [data]
  );

  const [view, setView] = useReduxState(
    selectView,
    blueprintsSlice.actions.setView
  );

  const [groupBy, setGroupBy] = useReduxState(
    selectGroupBy,
    blueprintsSlice.actions.setGroupBy
  );

  const [sortBy, setSortBy] = useReduxState(
    selectSortBy,
    blueprintsSlice.actions.setSortBy
  );

  const filters = useSelector(selectFilters);

  const tableInstance = useTable<InstallableViewItem>(
    {
      columns,
      data,
      initialState: {
        groupBy,
        sortBy,
        filters,
      },
      useControlledState: (state) =>
        useMemo(
          () => ({
            ...state,
            groupBy,
            sortBy,
            filters: state.globalFilter ? [] : filters,
          }),
          // eslint-disable-next-line react-hooks/exhaustive-deps -- table props are required dependencies
          [state, groupBy, sortBy, filters]
        ),
    },
    useFilters,
    useGlobalFilter,
    useGroupBy,
    useSortBy
  );

  const {
    rows,
    flatRows,
    flatHeaders,
    setGlobalFilter,
    state: { globalFilter },
  } = tableInstance;

  console.log("Rows:", rows);
  console.log("Flat rows:", flatRows);

  const isGrouped = groupBy.length > 0;
  const isSorted = sortBy.length > 0;
  const numberOfBlueprints = isGrouped
    ? flatRows.length - rows.length
    : rows.length;

  const { groupByOptions, sortByOptions } = useMemo(() => {
    const groupByOptions = flatHeaders
      .filter((column) => column.canGroupBy)
      .map((column) => ({
        label: column.Header,
        value: column.id,
      }));

    const sortByOptions = flatHeaders
      .filter((column) => column.canSort)
      .map((column) => ({
        label: column.Header,
        value: column.id,
      }));

    return { groupByOptions, sortByOptions };
  }, [flatHeaders]);

  const BlueprintsView = view === "list" ? ListView : GridView;

  return (
    <BootstrapRow className={styles.root}>
      <ListFilters
        teamFilters={teamFilters}
        setGlobalFilter={setGlobalFilter}
      />
      <Col className={styles.mainContainer}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className={styles.filterTitle}>
            {globalFilter
              ? "Search results"
              : `${filters.length > 0 ? filters[0].value : "All"} Blueprints`}
          </h3>
          <span className="d-flex align-items-center small">
            <span className="ml-3 mr-2">Group by:</span>
            <Select
              isClearable
              placeholder="Group by"
              options={groupByOptions}
              onChange={(option, { action }) => {
                const value = action === "clear" ? [] : [option.value];
                setGroupBy(value);
              }}
              value={groupByOptions.find((opt) => opt.value === groupBy[0])}
            />

            <span className="ml-3 mr-2">Sort by:</span>
            <Select
              isClearable
              placeholder="Sort by"
              options={sortByOptions}
              onChange={(option, { action }) => {
                const value =
                  action === "clear" ? [] : [{ id: option.value, desc: false }];
                setSortBy(value);
              }}
              value={sortByOptions.find((opt) => opt.value === sortBy[0]?.id)}
            />

            {isSorted && (
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  const value = [{ id: sortBy[0].id, desc: !sortBy[0].desc }];
                  setSortBy(value);
                }}
              >
                <FontAwesomeIcon
                  icon={
                    sortBy[0].id === "updatedAt"
                      ? sortBy[0].desc
                        ? faSortAmountDownAlt
                        : faSortAmountUpAlt
                      : sortBy[0].desc
                      ? faSortAmountUpAlt
                      : faSortAmountDownAlt
                  }
                  size="lg"
                />
              </Button>
            )}
            <Button
              variant={view === "list" ? "link" : "outline-link"}
              size="sm"
              className="ml-3"
              onClick={() => {
                setView("list");
              }}
            >
              <FontAwesomeIcon icon={faList} size="lg" />
            </Button>
            <Button
              variant={view === "grid" ? "link" : "outline-link"}
              size="sm"
              onClick={() => {
                setView("grid");
              }}
            >
              <FontAwesomeIcon icon={faThLarge} size="lg" />
            </Button>
          </span>
        </div>
        {/* This wrapper prevents AutoSizer overflow in a flex box container */}
        <div style={{ flex: "1 1 auto" }}>
          <AutoSizer defaultHeight={500}>
            {({ height, width }) => (
              <div>
                {globalFilter && (
                  <p>
                    {numberOfBlueprints} results for{" "}
                    <strong>&quot;{globalFilter}&quot;</strong>
                  </p>
                )}
                <BlueprintsView
                  tableInstance={tableInstance}
                  rows={rows}
                  width={width}
                  height={height}
                />
              </div>
            )}
          </AutoSizer>
        </div>
      </Col>
    </BootstrapRow>
  );
};

export default BlueprintsCard;
