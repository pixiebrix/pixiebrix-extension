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

import React, { useContext } from "react";
import { Card, Col, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboardCheck,
  faExternalLinkAlt,
} from "@fortawesome/free-solid-svg-icons";
import AuthContext from "@/auth/AuthContext";

const ActivateFromMarketplaceColumn: React.FunctionComponent = () => (
  <Col>
    <h4>Activate an Official Template</h4>
    <p>
      <span className="text-primary">
        The easiest way to start using PixieBrix!
      </span>{" "}
      Activate a pre-made template from the Templates page.
    </p>
    <Link to={"/templates"} className="btn btn-info">
      View Templates&nbsp;
      <FontAwesomeIcon icon={faClipboardCheck} />
    </Link>
  </Col>
);

const CreateBrickColumn: React.FunctionComponent = () => (
  <Col>
    <h4>Create your Own</h4>
    <p>
      Follow the Quickstart Guide in our documentation area to start creating
      your own bricks in minutes.
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
);

const OnboardingVideoCard: React.FunctionComponent = () => (
  <Card>
    <Card.Header>Video Tour</Card.Header>
    <Card.Body className="mx-auto">
      <div>
        <iframe
          title="onboarding-video"
          src="https://player.vimeo.com/video/514828533"
          width="640"
          height="400"
          frameBorder="0"
          allow="fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    </Card.Body>
  </Card>
);

const OnboardingPage: React.FunctionComponent = () => {
  const { flags } = useContext(AuthContext);

  return (
    <>
      {!flags.includes("restricted-onboarding") && (
        <Row>
          <Col className="VideoCard">
            <Card>
              <Card.Header>Activate Bricks</Card.Header>
              <Card.Body>
                <Row>
                  <ActivateFromMarketplaceColumn />
                  <CreateBrickColumn />
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
      <Row>
        <Col className="VideoCard mt-3">
          <OnboardingVideoCard />
        </Col>
      </Row>
    </>
  );
};

export default OnboardingPage;
