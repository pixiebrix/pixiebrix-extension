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

import React from "react";
import {
  type Installable,
  type InstallableViewItem,
} from "@/extensionConsole/pages/blueprints/blueprintsTypes";
import { ListGroup } from "react-bootstrap";
import useInstallableViewItems from "@/extensionConsole/pages/blueprints/useInstallableViewItems";
import { type Column, useTable } from "react-table";
import Loader from "@/components/Loader";
import { ActiveModListItem } from "@/sidebar/homePanel/ActiveModListItem";

const columns: Array<Column<InstallableViewItem>> = [
  {
    Header: "Name",
    accessor: "name",
  },
  {
    Header: "Last updated",
    accessor: "updatedAt",
    sortInverted: true,
  },
];

export const ActiveModsList: React.FunctionComponent<{
  installables: Installable[];
}> = ({ installables }) => {
  const { installableViewItems, isLoading } =
    useInstallableViewItems(installables);

  const tableInstance = useTable<InstallableViewItem>({
    columns,
    data: installableViewItems.filter(
      (installableViewItem) => installableViewItem.status === "Active"
    ),
  });

  return (
    <>
      {isLoading ? (
        <Loader />
      ) : (
        <ListGroup {...tableInstance.getTableProps()} className="flex-grow">
          {tableInstance.rows.map((row) => {
            tableInstance.prepareRow(row);
            return (
              <ActiveModListItem
                key={row.original.sharing.packageId}
                installableItem={row.original}
              />
            );
          })}
        </ListGroup>
      )}
    </>
  );
};

export default ActiveModsList;
