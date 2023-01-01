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

import styles from "./ExtensionsBody.module.scss";

import React from "react";
import { Badge, Col } from "react-bootstrap";
import { type RecipeDefinition } from "@/types/definitions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCube } from "@fortawesome/free-solid-svg-icons";

const ExtensionBadge: React.FunctionComponent<{
  name: string;
}> = ({ name }) => (
  <Badge className={styles.extensionBadge}>
    <FontAwesomeIcon icon={faCube} /> {name}
  </Badge>
);

interface OwnProps {
  blueprint: RecipeDefinition;
}

const ExtensionsBody: React.FunctionComponent<OwnProps> = ({ blueprint }) => (
  <Col>
    {blueprint.extensionPoints.map((definition, index) => (
      <ExtensionBadge key={definition.id} name={definition.label} />
    ))}
  </Col>
);

export default ExtensionsBody;
