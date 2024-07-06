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

import React from "react";
import {
  faBars,
  faBolt,
  faCloud,
  faColumns,
  faCube,
  faMousePointer,
  faStoreAlt,
  faWindowMaximize,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./UserDefinedPackagesCard.module.scss";
import { type IconProp } from "@fortawesome/fontawesome-svg-core";
import { type Column } from "react-table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type EnrichedPackage, type NavigateProps } from "./workshopTypes";
import PaginatedTable from "@/components/paginatedTable/PaginatedTable";
import AsyncCard from "@/components/asyncCard/AsyncCard";
import {
  type KindFilterValue,
  mapKindToKindUiValue,
} from "@/extensionConsole/pages/workshop/workshopUtils";
import { type Nullishable } from "@/utils/nullishUtils";

type TableColumn = Column<EnrichedPackage>;
function inferIcon(
  kind: KindFilterValue,
  verboseName: Nullishable<string>,
): IconProp {
  switch (kind) {
    case "Integration": {
      return faCloud;
    }

    case "Mod": {
      return faStoreAlt;
    }

    case "Starter": {
      if (verboseName == null) {
        return faCube;
      }

      // HACK: inferring from the brick naming convention instead of the type since the API doesn't return it yet
      const normalized = verboseName.toLowerCase();
      if (normalized.includes("trigger")) {
        return faBolt;
      }

      if (normalized.includes("panel")) {
        return faWindowMaximize;
      }

      if (normalized.includes("button")) {
        return faMousePointer;
      }

      if (normalized.includes("context")) {
        return faBars;
      }

      if (normalized.includes("menu")) {
        return faMousePointer;
      }

      if (normalized.includes("sidebar")) {
        return faColumns;
      }

      return faCube;
    }

    default: {
      return faCube;
    }
  }
}

const KindIcon: React.FunctionComponent<{ brick: EnrichedPackage }> = ({
  brick: { kind, verbose_name },
}) => (
  <FontAwesomeIcon
    icon={inferIcon(mapKindToKindUiValue(kind), verbose_name)}
    fixedWidth
  />
);

const COLUMNS: TableColumn[] = [
  {
    Header: "Package Name",
    accessor: "name",
    width: 250,
    Cell: ({ row, value }) => (
      <div className="d-flex align-items-center w-100 overflow-hidden">
        <div className="text-right text-muted px-1">
          <KindIcon brick={row.original} />
        </div>
        <div className="ml-1">
          <p>{row.original.verbose_name}</p>
          <div className="mt-1">
            <code className="p-0" style={{ fontSize: "0.8rem" }}>
              {value}
            </code>
          </div>
        </div>
      </div>
    ),
  },
  {
    Header: "Collection",
    accessor: "collection",
  },
  {
    Header: "Type",
    accessor: ({ kind }) => mapKindToKindUiValue(kind),
  },
  {
    Header: "Version",
    accessor: "version",
  },
] as const;

const UserDefinedPackagesCard: React.FunctionComponent<
  NavigateProps & {
    packages: EnrichedPackage[];
    maxRows?: number;
    isFetching: boolean;
    error: unknown;
  }
> = ({ navigate, packages, isFetching, error }) => (
  <AsyncCard header="Packages" isLoading={isFetching} error={error}>
    {() => (
      <PaginatedTable
        columns={COLUMNS}
        data={packages}
        rowProps={(editablePackage: EnrichedPackage) => ({
          onClick() {
            navigate(`/workshop/bricks/${editablePackage.id}`);
          },
          className: `${styles.customRow}`,
        })}
        showSearchFilter={false}
      />
    )}
  </AsyncCard>
);

export default UserDefinedPackagesCard;
