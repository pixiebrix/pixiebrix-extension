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

import React, { useMemo } from "react";
import {
  faBars,
  faBolt,
  faBookOpen,
  faCloud,
  faColumns,
  faCube,
  faMousePointer,
  faStoreAlt,
  faWindowMaximize,
} from "@fortawesome/free-solid-svg-icons";
import { Kind } from "@/registry/localRegistry";
import styles from "./CustomBricksCard.module.scss";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { Column } from "react-table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { EnrichedBrick, NavigateProps } from "./workshopTypes";
import PaginatedTable from "@/components/paginatedTable/PaginatedTable";
import AsyncCard from "@/components/asyncCard/AsyncCard";

type TableColumn = Column<EnrichedBrick>;
function inferIcon(kind: Kind, verboseName: string): IconProp {
  switch (kind.toLocaleLowerCase()) {
    case "service": {
      return faCloud;
    }

    case "reader": {
      return faBookOpen;
    }

    case "blueprint": {
      return faStoreAlt;
    }

    case "foundation": {
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

const KindIcon: React.FunctionComponent<{ brick: EnrichedBrick }> = ({
  brick: { kind, verbose_name },
}) => <FontAwesomeIcon icon={inferIcon(kind, verbose_name)} fixedWidth />;

const columnFactory = (): TableColumn[] => [
  {
    Header: "Name",
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
    accessor: "kind",
  },
  {
    Header: "Version",
    accessor: "version",
  },
];

const CustomBricksCard: React.FunctionComponent<
  NavigateProps & {
    bricks: EnrichedBrick[];
    maxRows?: number;
    isFetching: boolean;
    error: unknown;
  }
> = ({ navigate, bricks, isFetching, error }) => {
  const columns = useMemo(() => columnFactory(), []);
  return (
    <AsyncCard header="Custom Bricks" isPending={isFetching} error={error}>
      {() => (
        <PaginatedTable
          columns={columns}
          data={bricks}
          rowProps={(brick: EnrichedBrick) => ({
            onClick() {
              navigate(`/workshop/bricks/${brick.id}`);
            },
            className: `${styles.customRow}`,
          })}
          showSearchFilter={false}
        />
      )}
    </AsyncCard>
  );
};

export default CustomBricksCard;
