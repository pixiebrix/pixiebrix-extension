/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { Alert, Card } from "react-bootstrap";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";

const UnsupportedApiV1: React.FC = () => (
  <Card>
    <Card.Header>Unsupported Extension Runtime Version</Card.Header>
    <Card.Body>
      <Alert variant="warning">
        <FontAwesomeIcon icon={faExclamationTriangle} />
        {"  "}Bricks created with the runtime API v1 are no longer supported in
        the Page Editor.
      </Alert>
      <p>
        Use the Workshop to edit this brick/extension.{" "}
        <a
          href="https://docs.pixiebrix.com/runtime"
          target="_blank"
          rel="noreferrer"
        >
          Read more about this change here.
        </a>
      </p>
    </Card.Body>
  </Card>
);

export default UnsupportedApiV1;
