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
import { Button, Card, Col, Popover, Row } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import AuthContext from "@/auth/AuthContext";
import { Organization } from "@/types/contract";

const ActivateFromMarketplaceColumn: React.FunctionComponent = () => (
  <Col>
    <h4>Activate an Official Blueprint</h4>
    <p>
      <span className="text-primary">
        The easiest way to start using PixieBrix!
      </span>{" "}
      Activate a pre-made blueprint from the Marketplace.
    </p>
    <Button
      href="https://pixiebrix.com/marketplace/"
      variant="info"
      target="_blank"
    >
      <FontAwesomeIcon icon={faExternalLinkAlt} /> &nbsp;Browse the Marketplace
    </Button>
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
      <FontAwesomeIcon icon={faExternalLinkAlt} /> &nbsp;Open Quickstart Guide
    </a>
  </Col>
);

const ActivateFromDeploymentBanner: React.FunctionComponent = () => (
  <Col>
    <h4>Activate Team Blueprints</h4>
    <p>
      It looks like your team has bricks that are ready to activate! Click the
      &quot;Activate&quot; button in the banner above.
    </p>
    <a
      className="btn btn-info"
      href="https://docs.pixiebrix.com/quick-start-guide"
      target="_blank"
      rel="noopener noreferrer"
    >
      <FontAwesomeIcon icon={faExternalLinkAlt} /> &nbsp;Open Quickstart Guide
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

const OnboardingPage: React.FunctionComponent<{
  organizations: Organization[];
  hasDeployments: boolean;
}> = ({ organizations, hasDeployments }) => {
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
