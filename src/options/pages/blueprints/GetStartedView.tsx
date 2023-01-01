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

import styles from "./GetStartedView.module.scss";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCube,
  faCubes,
  faExternalLinkAlt,
} from "@fortawesome/free-solid-svg-icons";
import blueprintsNavItemScreenshot from "@img/blueprints-nav-item-screenshot.png";
import { Col, Row } from "react-bootstrap";
import { isMac } from "@/utils";
import { MARKETPLACE_URL } from "@/utils/strings";

const ExternalLink: React.VoidFunctionComponent<{
  linkText: string;
  url: string;
}> = ({ linkText, url }) => (
  <span>
    <a href={url} target="_blank" rel="noopener noreferrer">
      {linkText}
    </a>
    <FontAwesomeIcon
      icon={faExternalLinkAlt}
      className={styles.externalLinkIcon}
      size="xs"
    />
  </span>
);

const GetStartedView: React.VoidFunctionComponent<{
  width: number;
  height: number;
}> = ({ width, height }) => (
  <div
    style={{ height: `${height}px`, width: `${width}px` }}
    className={styles.root}
  >
    <Row className={styles.infoRow}>
      <Col>
        <p className={styles.termDefinition}>
          <img
            src={blueprintsNavItemScreenshot}
            alt="Screenshot of the Blueprints tab in the sidebar"
            height={70}
            className={styles.inlineFigure}
          />
          On this Blueprints tab, you can manage the Blueprints you have access
          to.
        </p>
        <p className={styles.termDefinition}>
          <FontAwesomeIcon
            icon={faCubes}
            size="2x"
            className={styles.inlineFigure}
          />
          <span>
            A <strong>Blueprint</strong> is like a folder or container for a
            group of Extensions.
          </span>
        </p>
        <p className={styles.termDefinition}>
          <FontAwesomeIcon
            icon={faCube}
            size="2x"
            className={styles.inlineFigure}
          />
          <span>
            An <strong>Extension</strong> is a workflow that allows you to
            automate, customize, or change things on a webpage in your browser.
          </span>
        </p>
        <p>
          You can manage the Blueprints that you&apos;ve created, Blueprints
          from a team you&apos;re a member of, and Blueprints you activate from
          the Marketplace.
        </p>
      </Col>
    </Row>
    <Row className={styles.infoRow}>
      <Col>
        <h4>Want to create a new Blueprint?</h4>
        <ul>
          <li>
            Start by opening a new browser tab navigating to the webpage
            you&apos;d like to modify.
          </li>
          <li>
            Go to the PixieBrix tab via the <strong>Chrome DevTools</strong>{" "}
            using{" "}
            {isMac() ? (
              <kbd>Cmd + Option + C</kbd>
            ) : (
              <kbd>Ctrl + Shift + C</kbd>
            )}{" "}
            or <kbd>F12</kbd> and start editing your page.
          </li>
          <li>
            Save your Blueprint in the Page Editor and you&apos;ll see it show
            up here as a personal Blueprint.
          </li>
        </ul>
      </Col>
    </Row>
    <Row className={styles.infoRow}>
      <Col>
        <h4>Need more help?</h4>
        <p>
          Visit the{" "}
          <ExternalLink
            linkText="Quick Start Guide"
            url="https://docs.pixiebrix.com/quick-start-guide"
          />{" "}
          or ask questions in the{" "}
          <ExternalLink
            linkText="Slack Community"
            url="https://pixiebrixcommunity.slack.com/join/shared_invite/zt-13gmwdijb-Q5nVsSx5wRLmRwL3~lsDww#/shared-invite/email"
          />
          .
        </p>
        <p>
          {" "}
          Visit the{" "}
          <ExternalLink
            linkText="PixieBrix Marketplace"
            url={MARKETPLACE_URL}
          />{" "}
          for ideas.
        </p>
      </Col>
    </Row>
  </div>
);

export default GetStartedView;
