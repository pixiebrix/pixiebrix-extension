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
import React, { useContext, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  getDescription,
  getLabel,
  getPackageId,
  getSharingType,
  getUpdatedAt,
  Installable,
} from "@/options/pages/blueprints/installableUtils";
import AuthContext from "@/auth/AuthContext";
import {
  Column,
  Row,
  ColumnInstance,
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
import BlueprintTableList from "@/options/pages/blueprints/BlueprintTableList";
import { RegistryId } from "@/core";
import ListFilters from "./ListFilters";

const getFilterOptions = (column: ColumnInstance) => {
  const options = new Set();
  for (const row of column.preFilteredRows) {
    options.add(row.values[column.id]);
  }

  return [...options.values()];
};

// Reshaped Installable to easily filter, sort, and group Installables
export type InstallableRow = {
  name: string;
  description: string;
  sharing: {
    packageId: RegistryId;
    source: {
      type: string;
      label: string;
    };
  };
  updatedAt: string;
  status: "Active" | "Uninstalled";
  // Used to get Installable actions from useInstallableActions
  installable: Installable;
};

const getInstallableRows = (
  installables: Installable[],
  scope: string
): InstallableRow[] =>
  installables.map(
    (installable): InstallableRow => ({
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
const columns: Array<Column<InstallableRow>> = [
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
  const data: InstallableRow[] = useMemo(
    () => getInstallableRows(installables, scope),
    [installables, scope]
  );

  useEffect(() => {
    setAllFilters([{ id: "status", value: "Active" }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on first mount
  }, []);

  const tableInstance = useTable(
    { columns, data },
    useFilters,
    useGroupBy,
    useSortBy
  );

  const [view, setView] = useState<"list" | "grid">("list");

  const {
    rows,
    flatHeaders,
    // @ts-expect-error -- for some reason, react-table index.d.ts UseGroupByInstanceProps
    // doesn't have setGroupBy?
    setGroupBy,
    setAllFilters,
    setSortBy,
    state: { groupBy, sortBy, filters },
  } = tableInstance;

  const isGrouped = useMemo(() => groupBy.length > 0, [groupBy]);
  const isSorted = useMemo(() => sortBy.length > 0, [sortBy]);

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

  const teamFilters = useMemo(() => {
    const sharingColumn = flatHeaders.find(
      (header) => header.id === "sharing.source.label"
    );
    return getFilterOptions(sharingColumn).filter(
      (option) => !["Personal", "Public"].includes(option as string)
    ) as string[];
  }, [flatHeaders]);

  return (
    <BootstrapRow>
      <ListFilters setAllFilters={setAllFilters} teamFilters={teamFilters} />
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
                if (action === "clear") {
                  setGroupBy([]);
                  return;
                }

                setGroupBy([option.value]);
              }}
            />

            <span className="ml-3 mr-2">Sort by:</span>
            <Select
              isClearable
              placeholder="Sort by"
              options={sortByOptions}
              onChange={(option, { action }) => {
                if (action === "clear") {
                  setSortBy([]);
                  return;
                }

                setSortBy([{ id: option.value, desc: false }]);
              }}
            />

            {isSorted && (
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setSortBy(
                    sortBy.map((sort) => {
                      sort.desc = !sort.desc;
                      return sort;
                    })
                  );
                }}
              >
                <FontAwesomeIcon
                  icon={
                    sortBy[0].desc ? faSortAmountUpAlt : faSortAmountDownAlt
                  }
                  size="lg"
                />
              </Button>
            )}
            <Button
              variant={view === "list" ? "link" : "outline-link"}
              size="sm"
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
              <>
                <h5 className="text-muted mt-3">{row.groupByVal}</h5>
                <BlueprintTableList
                  tableInstance={tableInstance}
                  rows={row.subRows as Array<Row<InstallableRow>>}
                />
              </>
            ))}
          </>
        ) : (
          <BlueprintTableList
            tableInstance={tableInstance}
            rows={rows as Array<Row<InstallableRow>>}
          />
        )}
      </Col>
    </BootstrapRow>
  );
};

export default BlueprintsCard;
