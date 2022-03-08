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

import styles from "./OnboardingView.module.scss";

import React, { useMemo } from "react";
import { Button, Card, Col, Row } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import marketplaceImage from "@img/marketplace.svg";
import { OnboardingType } from "@/options/pages/blueprints/onboardingView/useOnboarding";
import useReduxState from "@/hooks/useReduxState";
import { selectFilters } from "@/options/pages/blueprints/blueprintsSelectors";
import blueprintsSlice from "@/options/pages/blueprints/blueprintsSlice";
import Loader from "@/components/Loader";

const ActivateFromMarketplaceColumn: React.VoidFunctionComponent = () => (
  <Col xs={6}>
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
      size="sm"
    >
      <FontAwesomeIcon icon={faExternalLinkAlt} /> &nbsp;Browse the Marketplace
    </Button>
  </Col>
);

const ActivateTeamBlueprintsColumn: React.VoidFunctionComponent = () => {
  // TODO: select only setFilters action
  const [, setFilters] = useReduxState(
    selectFilters,
    blueprintsSlice.actions.setFilters
  );

  return (
    <Col xs={6}>
      <h4>Activate Team Blueprints</h4>
      <p>
        You can browse blueprints shared with you using the category filters on
        this page.
      </p>
      <Button
        size="sm"
        onClick={() => {
          setFilters([]);
        }}
      >
        View my blueprints
      </Button>
    </Col>
  );
};

const ActivateFromDeploymentBannerColumn: React.VoidFunctionComponent = () => (
  <Col>
    <p>
      Click the <strong className="text-primary">Activate</strong> button in the{" "}
      <strong className="text-info">blue banner above</strong> to start using
      your team bricks. You will see this banner every time your team deploys
      new or updated bricks for you to use.
    </p>
  </Col>
);

const ContactTeamAdminColumn: React.VoidFunctionComponent = () => (
  <Col>
    <p>
      It looks like your team hasn&apos;t made any bricks available to you yet.{" "}
      <strong>Contact your team admin</strong> to get access to your team&apos;s
      bricks.
    </p>
  </Col>
);

const CreateBrickColumn: React.VoidFunctionComponent = () => (
  <Col xs={6}>
    <h4>Create your Own</h4>
    <p>
      Follow the Quick Start Guide to start creating your own blueprints in
      minutes.
    </p>
    <a
      className="btn btn-info btn-sm"
      href="https://docs.pixiebrix.com/quick-start-guide"
      target="_blank"
      rel="noopener noreferrer"
    >
      <FontAwesomeIcon icon={faExternalLinkAlt} /> &nbsp;Open Quick Start
    </a>
  </Col>
);

const OnboardingView: React.VoidFunctionComponent<{
  onboardingType: OnboardingType;
  isLoading: boolean;
  width: number;
  height: number;
}> = ({ onboardingType, isLoading, width, height }) => {
  const onBoardingInformation = useMemo(() => {
    switch (onboardingType) {
      case "hasDeployments":
        return <ActivateFromDeploymentBannerColumn />;
      case "restricted":
        return <ContactTeamAdminColumn />;
      case "hasTeamBlueprints":
        return (
          <>
            <ActivateTeamBlueprintsColumn />
            <CreateBrickColumn />
          </>
        );
      default:
        return (
          <>
            <ActivateFromMarketplaceColumn />
            <CreateBrickColumn />
          </>
        );
    }
  }, [onboardingType]);

  return (
    <div style={{ height: `${height}px`, width: `${width}px` }}>
      <Card className={styles.root}>
        <Card.Body className={styles.cardBody}>
          <img src={marketplaceImage} alt="Marketplace" width={300} />
          <h3 className="mb-4">You don't have any active blueprints</h3>
          {!isLoading && <Row>{onBoardingInformation}</Row>}
        </Card.Body>
      </Card>
    </div>
  );
};

export default OnboardingView;
