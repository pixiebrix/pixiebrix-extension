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

import styles from "./QuickAdd.module.scss";

import React from "react";
import { Card } from "react-bootstrap";
import PackageIcon from "../PackageIcon";
import cx from "classnames";
import { type PackageInstance } from "../../types/registryTypes";

type OwnProps<Instance extends PackageInstance> = {
  onSelect: (packageInstance: Instance) => void;
  recommendations: Instance[] | undefined;
};

const QuickAdd = <Instance extends PackageInstance>({
  recommendations,
  onSelect,
}: OwnProps<Instance>) => (
  <div>
    <h4>Recommended Packages</h4>
    <div className={styles.root}>
      {(recommendations ?? []).map((packageInstance) => (
        <Card
          className={styles.card}
          key={packageInstance.id}
          onClick={() => {
            onSelect(packageInstance);
          }}
        >
          <Card.Body className={cx("text-center", "pt-2", styles.cardImage)}>
            <div>
              <PackageIcon packageOrMetadata={packageInstance} />
            </div>
          </Card.Body>
          <Card.Body>
            <Card.Title>{packageInstance.name}</Card.Title>
            <Card.Text className="small pt-2">
              {packageInstance.description}
            </Card.Text>
          </Card.Body>
        </Card>
      ))}
    </div>
  </div>
);

export default QuickAdd;
