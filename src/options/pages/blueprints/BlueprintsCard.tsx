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

import { Button, Col, Row as BootstrapRow } from "react-bootstrap";
import React, { Fragment, useContext, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  getDescription,
  getLabel,
  getPackageId,
  getSharingType,
  getUpdatedAt,
} from "./installableUtils";
import AuthContext from "@/auth/AuthContext";
import {
  Column,
  useFilters,
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
import TableView from "./tableView/TableView";
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

const getInstallableRows = (
  installables: Installable[],
  scope: string
): InstallableViewItem[] =>
  installables.map(
    (installable): InstallableViewItem => ({
      name: getLabel(installable),
      description: getDescription(installable),
      sharing: {
        packageId: getPackageId(installable),
        source: getSharingType(installable, scope),
      },
      updatedAt: getUpdatedAt(installable),
      status: installable.active ? "Active" : "Uninstalled",
      installable,
    })
  );

// These react-table columns aren't rendered as column headings,
// but used to expose grouping, sorting, and filtering utilities
// (and eventually pagination & global searching) on InstallableRows
const columns: Array<Column<InstallableViewItem>> = [
  {
    Header: "Name",
    accessor: "name",
    disableGroupBy: true,
    disableFilters: true,
  },
  {
    Header: "Sharing",
    // @ts-expect-error -- react-table allows nested accessors
    accessor: "sharing.source.label",
  },
  {
    Header: "Last modified",
    accessor: "updatedAt",
    disableGroupBy: true,
    disableFilters: true,
  },
  {
    Header: "Status",
    accessor: "status",
  },
];

const BlueprintsCard: React.FunctionComponent<{
  installables: Installable[];
}> = ({ installables }) => {
  const { scope } = useContext(AuthContext);
  const { data, teamFilters } = useMemo(() => {
    const data = getInstallableRows(installables, scope);
    const teamFilters = uniq(
      data.map((installable) => installable.sharing.source.label)
    ).filter((label) => label !== "Public" && label !== "Personal");
    return { data, teamFilters };
  }, [installables, scope]);

  const b = uniq(data.map((installable) => installable.sharing.source.label));
  console.log("sharing", { b });

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
            filters,
          }),
          // eslint-disable-next-line react-hooks/exhaustive-deps -- table props are required dependencies
          [state, groupBy, sortBy, filters]
        ),
    },
    useFilters,
    useGroupBy,
    useSortBy
  );

  const { rows, flatHeaders } = tableInstance;

  const isGrouped = groupBy.length > 0;
  const isSorted = sortBy.length > 0;

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

  const BlueprintsView = view === "list" ? TableView : GridView;

  return (
    <BootstrapRow>
      <ListFilters teamFilters={teamFilters} />
      <Col xs={9}>
        <div className="d-flex justify-content-between align-items-center">
          <h3 className="my-3">
            {filters.length > 0 ? filters[0].value : "All"} Blueprints
          </h3>
          <span className="d-flex align-items-center">
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
        {isGrouped ? (
          <>
            {rows.map((row) => (
              <Fragment key={row.groupByVal}>
                <h5 className="text-muted mt-3">{row.groupByVal}</h5>
                <BlueprintsView
                  tableInstance={tableInstance}
                  rows={row.subRows}
                />
              </Fragment>
            ))}
          </>
        ) : (
          <BlueprintsView tableInstance={tableInstance} rows={rows} />
        )}
      </Col>
    </BootstrapRow>
  );
};

export default BlueprintsCard;
