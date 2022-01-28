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

import React, { useEffect, useState } from "react";
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
import "./WorkshopPage.scss";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { Card, Table } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { EnrichedBrick, NavigateProps } from "./workshopTypes";
import Pagination from "@/components/pagination/Pagination";

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

const CustomBricksCard: React.FunctionComponent<
  NavigateProps & { bricks: EnrichedBrick[]; maxRows?: number }
> = ({ navigate, bricks, maxRows = 10 }) => {
  const [page, setPage] = useState(0);
  const numPages = Math.ceil(bricks.length / maxRows);

  useEffect(() => {
    setPage(0);
  }, [bricks, maxRows]);

  return (
    <Card>
      <Card.Header>Custom Bricks</Card.Header>
      <Table className="WorkshopPage__BrickTable">
        <thead>
          <tr>
            <th>&nbsp;</th>
            <th>Name</th>
            <th>Collection</th>
            <th>Type</th>
            <th>Version</th>
          </tr>
        </thead>
        <tbody>
          {bricks.slice(page * maxRows, (page + 1) * maxRows).map((brick) => (
            <tr
              key={brick.id}
              onClick={() => {
                navigate(`/workshop/bricks/${brick.id}`);
              }}
            >
              <td className="text-right text-muted px-1">
                <KindIcon brick={brick} />
              </td>
              <td>
                <div>{brick.verbose_name}</div>
                <div className="mt-1">
                  <code className="p-0" style={{ fontSize: "0.8rem" }}>
                    {brick.name}
                  </code>
                </div>
              </td>
              <td>{brick.collection}</td>
              <td>{brick.kind}</td>
              <td>{brick.version}</td>
            </tr>
          ))}
          {bricks.length >= maxRows && (
            <tr className="WorkshopPage__BrickTable__more">
              <td colSpan={5} className="text-info text-center">
                <Pagination page={page} setPage={setPage} numPages={numPages} />
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </Card>
  );
};

export default CustomBricksCard;
