/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import workshopImage from "../../img/workshop.svg";
import { Container } from "react-bootstrap";
import useFlags from "../hooks/useFlags";
import { isMac } from "../utils/browserUtils";
import { MARKETPLACE_URL } from "../urlConstants";
import { RestrictedFeatures } from "../auth/featureFlags";

const OnboardingContent: React.FunctionComponent = () => (
  <Container className={styles.root}>
    <div className={styles.sidebarRow}>
      <img src={workshopImage} alt="" width={300} />
    </div>

    <div className={styles.sidebarRow}>
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
    </div>

    <div className={styles.sidebarRowWithDivider}>
      <h4 className={styles.tinyCallout}>Need more help?</h4>
      <p>
        Visit the{" "}
        <a href="https://docs.pixiebrix.com/quick-start">Quick Start Guide</a>{" "}
        or ask questions in the{" "}
        <a href="https://pixiebrixcommunity.slack.com/join/shared_invite/zt-13gmwdijb-Q5nVsSx5wRLmRwL3~lsDww#/shared-invite/email">
          Slack Community
        </a>
        .{" "}
      </p>
      <p>
        Visit the <a href={MARKETPLACE_URL}>PixieBrix Marketplace</a> for ideas.
      </p>
    </div>
  </Container>
);

const NoAvailablePanelsContent: React.FunctionComponent = () => (
  <Container>
    <h4 className="text-center mt-4 display-6">
      No panels activated for the page
    </h4>

    <div className="text-center mt-4">
      <img src={workshopImage} alt="Workshop" width={300} />
    </div>
  </Container>
);

const DefaultPanel: React.FunctionComponent = () => {
  const { restrict } = useFlags();

  return (
    <div>
      {restrict(RestrictedFeatures.MARKETPLACE) ? (
        <NoAvailablePanelsContent />
      ) : (
        <OnboardingContent />
      )}
    </div>
  );
};

export default DefaultPanel;
