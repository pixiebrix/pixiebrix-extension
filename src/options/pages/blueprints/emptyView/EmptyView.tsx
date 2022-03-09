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

import React from "react";
import styles from "./EmptyView.module.scss";
import { InstallableViewItem } from "@/options/pages/blueprints/blueprintsTypes";
import { TableInstance } from "react-table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { Card } from "react-bootstrap";
import workshopImage from "@img/workshop.svg";

const EmptyView: React.VoidFunctionComponent<{
  tableInstance: TableInstance<InstallableViewItem>;
  height: number;
  width: number;
}> = ({ tableInstance, height, width }) => {
  const {
    state: { globalFilter },
  } = tableInstance;

  return (
    <div
      className={styles.root}
      style={{ height: `${height}px`, width: `${width}px` }}
    >
      <Card className={styles.card}>
        <Card.Body>
          <div className={styles.suggestions}>
            <img src={workshopImage} alt="Workshop" width={300} />
            <h3>No blueprints found</h3>
            <div className="mb-4">
              There {"weren't"} any blueprints with a name, description, or id
              containing your search term <strong>{`"${globalFilter}"`}</strong>
              .
            </div>
            <div>
              Try different search terms or search in the{" "}
              <a
                href={`https://pixiebrix.com/marketplace/search/?q=${encodeURI(
                  globalFilter
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} /> Public Marketplace
              </a>
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default EmptyView;
