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

import { Card, Table } from "react-bootstrap";
import React, { useContext, useMemo } from "react";
import styles from "./BlueprintsList.module.scss";
import BlueprintListEntry from "@/options/pages/blueprints/BlueprintListEntry";
import {
  getDescription,
  getLabel,
  getPackageId,
  getSharingType,
  getUniqueId,
  getUpdatedAt,
  Installable,
} from "@/options/pages/blueprints/installableUtils";
import AuthContext from "@/auth/AuthContext";
import { useGroupBy, useTable } from "react-table";
import Select from "react-select";
import cx from "classnames";

const BlueprintsList: React.FunctionComponent<{
  installables: Installable[];
}> = ({ installables }) => {
  const { scope } = useContext(AuthContext);

  const data = useMemo(() => {
    return installables.map((installable) => ({
      label: {
        name: getLabel(installable),
        description: getDescription(installable),
      },
      sharing: {
        packageId: getPackageId(installable),
        // TODO: move this along with scope above
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
    }));
  }, [installables, scope]);

  const columns = useMemo(
    () => [
      {
        Header: "Name",
        accessor: "label",
        disableGroupBy: true,
      },
      {
        Header: "Sharing",
        accessor: "sharing.source.label",
      },
      {
        Header: "Last modified",
        accessor: "updatedAt",
        disableGroupBy: true,
      },
      {
        Header: "Status",
        accessor: "status",
      },
      {
        Header: "Actions",
        accessor: "installable",
        disableGroupBy: true,
      },
    ],
    []
  );

  const tableInstance = useTable({ columns, data }, useGroupBy);

  const {
    getTableProps,
    getTableBodyProps,
    rows,
    prepareRow,
    headerGroups,
    toggleGroupBy,
    state: { groupBy },
  } = tableInstance;

  const isGrouped = useMemo(() => groupBy.length > 0, [groupBy]);

  const groupByOptions = headerGroups[0].headers
    .filter((column) => column.canGroupBy)
    .map((column) => ({
      label: column.Header,
      value: column.id,
    }));

  return (
    <>
      <div className="d-flex justify-content-between align-items-center">
        <h3 className="my-3">Filtered Blueprints</h3>
        <span className="d-flex align-items-center">
          <span>Group by:</span>
          <Select
            placeholder="Group by"
            options={groupByOptions}
            onChange={(option) => {
              toggleGroupBy(option.value);
            }}
          />
          <span>Sort by:</span>
          <Select placeholder="Sort by" options={[]} />
        </span>
      </div>
      {isGrouped ? (
        <>
          {rows.map((row) => {
            prepareRow(row);

            if (row.isGrouped) {
              return (
                <>
                  <h5 className="text-muted">{row.groupByVal}</h5>
                  <Card className={cx(styles.root, "mb-3")}>
                    <Table {...getTableProps()}>
                      <tbody {...getTableBodyProps()}>
                        {row.subRows.map((subRow) => {
                          console.log("Subrow:", subRow);
                          return (
                            <BlueprintListEntry
                              key={getUniqueId(subRow.values.installable)}
                              installableRow={subRow}
                            />
                          );
                        })}
                      </tbody>
                    </Table>
                  </Card>
                </>
              );
            }
          })}
        </>
      ) : (
        <Card className={styles.root}>
          <Table {...getTableProps()}>
            <tbody {...getTableBodyProps()}>
              {rows.map((row) => {
                prepareRow(row);

                return (
                  <BlueprintListEntry
                    key={getUniqueId(row.values.installable)}
                    installableRow={row}
                  />
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
};

export default BlueprintsList;
