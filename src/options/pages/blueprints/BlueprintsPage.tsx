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
import { useTitle } from "@/hooks/title";
import Page from "@/layout/Page";
import { faExternalLinkAlt, faScroll } from "@fortawesome/free-solid-svg-icons";
import { Button, Card, Col, Nav, Row } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const BlueprintsPage: React.FunctionComponent = () => {
  useTitle("Blueprints");

  return (
    <Page
      icon={faScroll}
      title={"Blueprints"}
      description={
        "Here you can find personal blueprints and blueprints shared with you to activate."
      }
      toolbar={
        <Button variant="info">
          <FontAwesomeIcon icon={faExternalLinkAlt} /> Open Public Marketplace
        </Button>
      }
    >
      <Row>
        <Col xs={3}>
          <Nav
            className="flex-column"
            variant="pills"
            defaultActiveKey="active"
          >
            <Nav.Item>
              <Nav.Link eventKey="active">Active Blueprints</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="shared">Shared with Me</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="personal">Personal Blueprints</Nav.Link>
            </Nav.Item>
          </Nav>
        </Col>
        <Col xs={9}>
          <h3>Active Blueprints</h3>
        </Col>
      </Row>
    </Page>
  );
};

export default BlueprintsPage;
