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

import React from "react";
import { useSelector } from "react-redux";
import marketplaceImage from "@img/marketplace.svg";
import workshopImage from "@img/workshop.svg";
import { Col, Container, Row } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { selectExtensions } from "@/store/extensionsSelectors";

const OnboardingContent: React.FunctionComponent = () => (
  <Container>
    <Row className="mt-4">
      <Col>
        <h4 className="display-6">Activate an Official Blueprint</h4>
        <p>
          <span className="text-primary">
            The easiest way to start using PixieBrix!
          </span>{" "}
          Activate a pre-made blueprint from the Public Marketplace.
        </p>
        <a
          className="btn btn-info"
          href="https://www.pixiebrix.com/marketplace/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Marketplace&nbsp;
          <FontAwesomeIcon icon={faExternalLinkAlt} />
        </a>
      </Col>
    </Row>

    <Row className="mt-4">
      <Col>
        <h4 className="display-6">Create your Own</h4>
        <p>
          Follow the Quickstart Guide to start creating your own bricks in
          minutes.
        </p>
        <a
          className="btn btn-info"
          href="https://docs.pixiebrix.com/quick-start-guide"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Quickstart Guide&nbsp;
          <FontAwesomeIcon icon={faExternalLinkAlt} />
        </a>
      </Col>
    </Row>

    <Row>
      <Col className="text-center">
        <img src={marketplaceImage} alt="Marketplace" width={300} />
      </Col>
    </Row>
  </Container>
);

const NoAvailablePanelsContent: React.FunctionComponent = () => (
  <Container>
    <Row className="mt-4">
      <Col className="text-center">
        <h4 className="display-6">No panels activated for the page</h4>
      </Col>
    </Row>

    <Row>
      <Col className="text-center">
        <img src={workshopImage} alt="Workshop" width={300} />
      </Col>
    </Row>
  </Container>
);

const DefaultActionPanel: React.FunctionComponent = () => {
  const extensions = useSelector(selectExtensions);

  return (
    <div>
      {extensions?.length > 0 ? (
        <NoAvailablePanelsContent />
      ) : (
        <OnboardingContent />
      )}
    </div>
  );
};

export default DefaultActionPanel;
