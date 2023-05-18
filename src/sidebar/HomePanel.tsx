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

import React, { type ReactNode } from "react";
import { type StaticPanelEntry } from "@/types/sidebarTypes";
import { Container } from "react-bootstrap";
import type { Column } from "react-table";
import type {
  Installable,
  InstallableViewItem,
} from "@/extensionConsole/pages/blueprints/blueprintsTypes";
import useInstallables from "@/extensionConsole/pages/blueprints/useInstallables";
import { ErrorDisplay } from "@/layout/ErrorDisplay";
import useInstallableViewItems from "@/extensionConsole/pages/blueprints/useInstallableViewItems";
import Loader from "@/components/Loader";
import { useTable } from "react-table";

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

const InstalledInstallablesList: React.FunctionComponent<{
  installables: Installable[];
}> = ({ installables }) => {
  const { installableViewItems, isLoading } =
    useInstallableViewItems(installables);

  const tableInstance = useTable<InstallableViewItem>({
    columns,
    data: installableViewItems,
  });

  return <div>{isLoading ? <Loader /> : "loaded"}</div>;
};

const HomePanel: React.FunctionComponent = () => {
  // TODO: skip useGetAllCloudExtensionsQuery
  const { installables, error } = useInstallables();
  return (
    <Container>
      Active mods
      {error ? (
        <ErrorDisplay error={error} />
      ) : (
        <InstalledInstallablesList installables={installables} />
      )}
    </Container>
  );
};

// TODO: move me
export const staticPanelMap: Record<string, ReactNode> = {
  home: <HomePanel />,
};

export const HOME_PANEL: StaticPanelEntry = {
  type: "staticPanel",
  heading: "Home",
  key: "home",
};

export default HomePanel;
