/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import styles from "./DefaultPanel.module.scss";

import React from "react";
import workshopImage from "@img/workshop.svg";
import { Col, Container, Row } from "react-bootstrap";
import { isMac } from "@/utils";
import useFlags from "@/hooks/useFlags";
import { MARKETPLACE_URL } from "@/utils/strings";

const OnboardingContent: React.FunctionComponent = () => (
  <Container className={styles.root}>
    <Row className={styles.sidebarRow}>
      <Col>
        <img src={workshopImage} alt="" width={300} />
      </Col>
    </Row>

    <Row className={styles.sidebarRow}>
      <Col>
        <h4 className={styles.callout}>Get started with PixieBrix</h4>
        <p>
          Go to the PixieBrix tab via the <strong>Chrome Dev Tools</strong>
        </p>
        <p>
          {isMac() ? (
            <kbd>&#8984; + Option + C</kbd>
          ) : (
            <kbd>Ctrl + Shift + C</kbd>
          )}
          or
          <kbd>F12</kbd>
        </p>
      </Col>
    </Row>

    <Row className={styles.sidebarRowWithDivider}>
      <Col>
        <h4 className={styles.tinyCallout}>Need more help?</h4>
        <p>
          Visit the{" "}
          <a
            href="https://docs.pixiebrix.com/quick-start-guide"
            target="_blank"
            rel="noopener noreferrer"
          >
            Quick Start Guide
          </a>{" "}
          or ask questions in the{" "}
          <a
            href="https://pixiebrixcommunity.slack.com/join/shared_invite/zt-13gmwdijb-Q5nVsSx5wRLmRwL3~lsDww#/shared-invite/email"
            target="_blank"
            rel="noopener noreferrer"
          >
            Slack Community
          </a>
          .{" "}
        </p>
        <p>
          Visit the{" "}
          <a href={MARKETPLACE_URL} target="_blank" rel="noopener noreferrer">
            PixieBrix Marketplace
          </a>{" "}
          for ideas.
        </p>
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

const DefaultPanel: React.FunctionComponent = () => {
  const { restrict } = useFlags();

  return (
    <div>
      {restrict("marketplace") ? (
        <NoAvailablePanelsContent />
      ) : (
        <OnboardingContent />
      )}
    </div>
  );
};

export default DefaultPanel;
