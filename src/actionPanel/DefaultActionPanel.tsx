import React from "react";
import { useSelector } from "react-redux";
import { OptionsState } from "@/options/slices";
import {
  InstalledExtension,
  selectExtensions,
} from "@/options/pages/InstalledPage";
import marketplaceImage from "@img/marketplace.svg";
import workshopImage from "@img/workshop.svg";
import { Button, Col, Container, Row } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboardCheck,
  faExternalLinkAlt,
} from "@fortawesome/free-solid-svg-icons";
import { openExtensionOptions } from "@/messaging/external";

const OnboardingContent: React.FunctionComponent = () => {
  return (
    <Container>
      <Row className="mt-4">
        <Col>
          <h4 className="display-6">Activate an Official Template</h4>
          <p>
            <span className="text-primary">
              The easiest way to start using PixieBrix!
            </span>{" "}
            Activate a pre-made template from the Templates page.
          </p>
          <Button onClick={() => openExtensionOptions()} variant="info">
            View Templates&nbsp;
            <FontAwesomeIcon icon={faClipboardCheck} />
          </Button>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col>
          <h4 className="display-6">Create your Own</h4>
          <p>
            Follow the Quickstart Guide in our documentation area to start
            creating your own bricks in minutes.
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
          <img src={marketplaceImage} alt="Marketplace image" width={300} />
        </Col>
      </Row>
    </Container>
  );
};

const NoAvailablePanelsContent: React.FunctionComponent = () => {
  return (
    <Container>
      <Row className="mt-4">
        <Col className="text-center">
          <h4 className="display-6">No panels activated for the page</h4>
        </Col>
      </Row>

      <Row>
        <Col className="text-center">
          <img src={workshopImage} alt="Workshop image" width={300} />
        </Col>
      </Row>
    </Container>
  );
};

const DefaultActionPanel: React.FunctionComponent = () => {
  const extensions = useSelector<
    { options: OptionsState },
    InstalledExtension[]
  >(selectExtensions);

  return (
    <div>
      {extensions?.length ? (
        <NoAvailablePanelsContent />
      ) : (
        <OnboardingContent />
      )}
    </div>
  );
};

export default DefaultActionPanel;
