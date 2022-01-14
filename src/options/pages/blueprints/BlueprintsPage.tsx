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

import React, { useState } from "react";
import { useTitle } from "@/hooks/title";
import Page from "@/layout/Page";
import { faExternalLinkAlt, faScroll } from "@fortawesome/free-solid-svg-icons";
import { Button, Col, Nav, Row } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import BlueprintsList from "@/options/pages/blueprints/BlueprintsList";
import useActivateables from "@/options/pages/blueprints/useActivateables";

// Should this go in useActivateables hook?
const categoryLabels = {
  active: "Active Blueprints",
  all: "All Blueprints",
  personal: "Personal Blueprints",
  shared: "Shared with Me",
};

const BlueprintsPage: React.FunctionComponent = () => {
  useTitle("Blueprints");

  const [filterCategory, setFilterCategory] = useState("active");
  const { blueprints, isLoading, error } = useActivateables();

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
      isPending={isLoading}
      error={error}
    >
      <Row>
        <Col xs={3}>
          <Nav
            className="flex-column"
            variant="pills"
            defaultActiveKey="active"
          >
            {Object.keys(blueprints).map((filter) => (
              <Nav.Item key={filter}>
                <Nav.Link
                  eventKey={filter}
                  onClick={() => {
                    setFilterCategory(filter);
                  }}
                >
                  {categoryLabels[filter]}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        </Col>
        <Col xs={9}>
          <h3>{categoryLabels[filterCategory]}</h3>
          {blueprints[filterCategory]?.length > 0 && (
            <BlueprintsList blueprints={blueprints[filterCategory]} />
          )}
        </Col>
      </Row>
    </Page>
  );
};

export default BlueprintsPage;
