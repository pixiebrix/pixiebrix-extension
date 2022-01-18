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
import useInstallables from "@/options/pages/blueprints/useInstallables";
import ExtensionLogsModal from "@/options/pages/installed/ExtensionLogsModal";
import { useSelector } from "react-redux";
import { RootState } from "@/options/store";
import {
  LogsContext,
  ShareContext,
} from "@/options/pages/installed/installedPageSlice";
import {
  selectShowLogsContext,
  selectShowShareContext,
} from "@/options/pages/installed/installedPageSelectors";
import ShareExtensionModal from "@/options/pages/installed/ShareExtensionModal";

// Should this go in useInstallables hook?
const categoryLabels = {
  active: "Active Blueprints",
  all: "All Blueprints",
  personal: "Personal Blueprints",
  shared: "Shared with Me",
};

const BlueprintsPage: React.FunctionComponent = () => {
  useTitle("Blueprints");

  const [filterCategory, setFilterCategory] = useState("active");
  const { blueprints, isLoading, error } = useInstallables();

  // todo: move
  const showLogsContext = useSelector<RootState, LogsContext>(
    selectShowLogsContext
  );

  // todo: move
  const showShareContext = useSelector<RootState, ShareContext>(
    selectShowShareContext
  );

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
      {showLogsContext && (
        <ExtensionLogsModal
          title={showLogsContext.title}
          context={showLogsContext.messageContext}
        />
      )}
      {showShareContext && (
        <ShareExtensionModal extension={showShareContext.extension} />
      )}
      <Row>
        <Col xs={3}>
          <h5>Category Filters</h5>
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
