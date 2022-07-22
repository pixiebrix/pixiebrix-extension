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
import { Button, Col, Container, Row } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSignInAlt } from "@fortawesome/free-solid-svg-icons";
import marketplaceImage from "@img/marketplace.svg";

// eslint-disable-next-line prefer-destructuring -- process.env variable
const SERVICE_URL = process.env.SERVICE_URL;

const LoginPanel: React.FunctionComponent = () => (
  <Container>
    <Row className="mt-4">
      <Col className="text-center">
        <h4 className="display-6">Connect PixieBrix Account</h4>

        <p>
          Register/log-in to PixieBrix to access your personal and team bricks
        </p>

        <Button
          className="mt-4"
          href={SERVICE_URL}
          target="_blank"
          variant="primary"
        >
          <FontAwesomeIcon icon={faSignInAlt} /> Connect Account
        </Button>
      </Col>
    </Row>

    <Row>
      <Col className="text-center">
        <img src={marketplaceImage} alt="Marketplace" width={300} />
      </Col>
    </Row>
  </Container>
);

export default LoginPanel;
