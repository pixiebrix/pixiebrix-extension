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

import { Button, Col, Nav, Row } from "react-bootstrap";
import React, { useContext, useEffect, useMemo } from "react";
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
import { useFilters, useGroupBy, useSortBy, useTable } from "react-table";
import Select from "react-select";
import {
  faSortAmountDownAlt,
  faSortAmountUpAlt,
} from "@fortawesome/free-solid-svg-icons";
import BlueprintsList from "@/options/pages/blueprints/BlueprintsList";
import { RegistryId } from "@/core";

function CategoryFilterNavItem({ setAllFilters, column }) {
  const options = React.useMemo(() => {
    const options = new Set();
    column.preFilteredRows.forEach((row) => {
      options.add(row.values[column.id]);
    });
    return [...options.values()];
  }, [column]);

  return (
    <>
      {options.map((option) => {
        return (
          <Nav.Item key={option}>
            <Nav.Link
              eventKey={option}
              onClick={() => {
                setAllFilters([{ id: column.id, value: option }]);
              }}
            >
              {option} Blueprints
            </Nav.Link>
          </Nav.Item>
        );
      })}
    </>
  );
}

type InstallableRow = {
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
        source: {
          type: getSharingType(installable, scope),
          label: ["Team", "Deployment"].includes(
            getSharingType(installable, scope) as string
          )
            ? installable.organization.name
            : getSharingType(installable, scope),
        },
      },
      updatedAt: getUpdatedAt(installable),
      status: installable.active ? "Active" : "Uninstalled",
      installable,
    })
  );

const columns = [
  {
    Header: "Name",
    accessor: "name",
    disableGroupBy: true,
    disableFilters: true,
  },
  {
    Header: "Sharing",
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
  {
    Header: "Actions",
    accessor: "installable",
    disableGroupBy: true,
    disableFilters: true,
    disableSortBy: true,
  },
];

const BlueprintsCard: React.FunctionComponent<{
  installables: Installable[];
}> = ({ installables }) => {
  const { scope } = useContext(AuthContext);
  const data = useMemo(() => getInstallableRows(installables, scope), [
    installables,
    scope,
  ]);

  const tableInstance = useTable(
    { columns, data },
    useFilters,
    useGroupBy,
    useSortBy
  );

  useEffect(() => {
    setAllFilters([{ id: "status", value: "Active" }]);
  }, []);

  const {
    getTableProps,
    getTableBodyProps,
    rows,
    prepareRow,
    headerGroups,
    toggleGroupBy,
    setGroupBy,
    setFilter,
    setAllFilters,
    setSortBy,
    state: { groupBy, sortBy, filters },
  } = tableInstance;

  const isGrouped = useMemo(() => groupBy.length > 0, [groupBy]);
  const isSorted = useMemo(() => sortBy.length > 0, [sortBy]);

  const groupByOptions = headerGroups[0].headers
    .filter((column) => column.canGroupBy)
    .map((column) => ({
      label: column.Header,
      value: column.id,
    }));

  const sortByOptions = headerGroups[0].headers
    .filter((column) => column.canSort)
    .map((column) => ({
      label: column.Header,
      value: column.id,
    }));

  return (
    <>
      <Row>
        <Col xs={3}>
          <h5>Category Filters</h5>
          <Nav
            className="flex-column"
            variant="pills"
            defaultActiveKey="active"
          >
            <Nav.Item>
              <Nav.Link
                eventKey="active"
                onClick={() => {
                  setAllFilters([{ id: "status", value: "Active" }]);
                }}
              >
                Active Blueprints
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                eventKey="all"
                onClick={() => {
                  setAllFilters([]);
                }}
              >
                All Blueprints
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                eventKey="personal"
                onClick={() => {
                  setAllFilters([
                    { id: "sharing.source.label", value: "Personal" },
                  ]);
                }}
              >
                Personal Blueprints
              </Nav.Link>
            </Nav.Item>
            <h5>Shared with Me</h5>
            {headerGroups[0].headers.map((header) => {
              if (!header.canFilter || header.id !== "sharing.source.label") {
                return null;
              }

              return (
                <CategoryFilterNavItem
                  key={header.id}
                  setAllFilters={setAllFilters}
                  column={header}
                />
              );
            })}
          </Nav>
        </Col>
        <Col xs={9}>
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="my-3">
              {filters.length > 0 ? filters[0].value : "All"} Blueprints
            </h3>
            <span className="d-flex align-items-center">
              <span>Group by:</span>
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
              <span>Sort by:</span>
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
                  {sortBy[0].desc ? (
                    <FontAwesomeIcon icon={faSortAmountUpAlt} size="lg" />
                  ) : (
                    <FontAwesomeIcon icon={faSortAmountDownAlt} size="lg" />
                  )}
                </Button>
              )}
            </span>
          </div>
          {isGrouped ? (
            <>
              {rows.map((row) => (
                <>
                  <h5 className="text-muted mt-3">{row.groupByVal}</h5>
                  <BlueprintsList
                    tableInstance={tableInstance}
                    rows={row.subRows}
                  />
                </>
              ))}
            </>
          ) : (
            <BlueprintsList tableInstance={tableInstance} rows={rows} />
          )}
        </Col>
      </Row>
    </>
  );
};

export default BlueprintsCard;
