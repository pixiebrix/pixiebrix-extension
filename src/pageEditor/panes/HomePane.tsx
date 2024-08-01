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

import React from "react";
import { Button, Col, Container, Row } from "react-bootstrap";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { useSelector } from "react-redux";
import { selectSessionId } from "@/pageEditor/store/session/sessionSelectors";
import paintbrush from "@img/paintbrush.svg";
import bgIllustration from "@img/home-pane-bg-illustration.png";

import styles from "@/pageEditor/panes/HomePane.module.scss";
import { inspectedTab } from "@/pageEditor/context/connection";

const TEMPLATE_TELEMETRY_SOURCE = "home_pane";

const Links: React.FunctionComponent = () => (
  <div className={styles.links}>
    <ul>
      <span className={styles.linkSectionHeader}>Support</span>
      <li>
        <a href="https://docs.pixiebrix.com/">Documentation</a>
      </li>
      <li>
        <a href="https://pixiebrix.thinkific.com/collections">
          PixieBrix Certification
        </a>
      </li>
      <li>
        <a href="https://slack.pixiebrix.com/">Join the Community Slack</a>
      </li>
    </ul>

    <ul>
      <span className={styles.linkSectionHeader}>Helpful Links</span>
      <li>
        <button
          onClick={async (event) => {
            event.preventDefault();
            await browser.runtime.openOptionsPage();
          }}
        >
          Extension Console
        </button>
      </li>
      <li>
        <a href="https://app.pixiebrix.com/">Admin Console</a>
      </li>
    </ul>
  </div>
);

const HomePane: React.FunctionComponent = () => {
  const sessionId = useSelector(selectSessionId);
  return (
    <Container fluid className="h-100 overflow-auto p-4">
      <Row className="gap-2">
        <img
          src={bgIllustration}
          alt="background illustration"
          className={styles.bgImage}
        />

        <Col xs={12} lg="auto">
          <img src={paintbrush} alt="Page Editor logo" />
        </Col>

        <Col xs={12} lg={7} xl="auto">
          <h1 className={styles.title}>Welcome to the Page Editor!</h1>
          <div className={styles.lead}>
            <div>You might recognize it from the video on the home page.</div>
            <div>
              Here, you can create mods that improve the UX of any web apps and
              sites you visit.
            </div>
          </div>

          <div>
            <div className={styles.text}>
              Not sure where to get started? Our Template Gallery has
              customizable templates with guides for the most popular use cases.
            </div>

            <div>
              <Button
                variant="primary"
                className={styles.button}
                onClick={() => {
                  reportEvent(Events.PAGE_EDITOR_VIEW_TEMPLATES, {
                    sessionId,
                    source: TEMPLATE_TELEMETRY_SOURCE,
                  });
                  void browser.tabs.update(inspectedTab.tabId, {
                    url: `https://www.pixiebrix.com/templates-gallery?utm_source=pixiebrix&utm_medium=page_editor&utm_campaign=${TEMPLATE_TELEMETRY_SOURCE}`,
                  });
                }}
              >
                Launch Template Gallery
              </Button>
            </div>
          </div>
        </Col>

        <Col xs={12} lg="auto">
          <Links />
        </Col>
      </Row>
    </Container>
  );
};

export default HomePane;
