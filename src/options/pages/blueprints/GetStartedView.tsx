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
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCube, faCubes } from "@fortawesome/free-solid-svg-icons";
import blueprintsNavItemScreenshot from "@img/blueprints-nav-item-screenshot.png";
import { Col, Row } from "react-bootstrap";

const GetStartedView: React.VoidFunctionComponent<{
  width: number;
  height: number;
}> = ({ width, height }) => (
  <div style={{ height: `${height}px`, width: `${width}px` }}>
    <Row>
      <Col>
        <p>
          <div>
            <img
              src={blueprintsNavItemScreenshot}
              alt="Screenshot of the Blueprints tab in the sidebar"
              height={70}
            />
          </div>
          On this Blueprints tab, you can manage the Blueprints you have access
          to.
        </p>
        <p>
          <FontAwesomeIcon icon={faCubes} /> A <strong>Blueprint</strong> is
          like a folder or container for a group of Extensions.
        </p>
        <p>
          <FontAwesomeIcon icon={faCube} /> An <strong>Extension</strong> is a
          workflow that allows you to automate, customize, or change things on a
          webpage in your browser.
        </p>
        <p>
          You can manage the Blueprints that you&apos;ve created, Blueprints
          from a team you&apos;re a member of, and Blueprints you activate from
          the Marketplace.
        </p>
        <h4>Want to create a new Blueprint?</h4>
        <ul>
          <li>
            Start by opening a new browser tab navigating to the webpage
            you&apos;d like to modify.
          </li>
          <li>
            Go to the PixieBrix tab via the <strong>Chrome DevTools</strong>{" "}
            using <kbd>Ctrl + Shift + C</kbd> or <kbd>F12</kbd> and start
            editing your page.
          </li>
          <li>
            Save your Blueprint in the Page Editor and you&apos;ll see it show
            up here as a personal Blueprint.
          </li>
        </ul>
        <h4>Need more help?</h4>
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
          {" "}
          Visit the{" "}
          <a
            href="https://www.pixiebrix.com/marketplace/"
            target="_blank"
            rel="noopener noreferrer"
          >
            PixieBrix Marketplace
          </a>{" "}
          for ideas.
        </p>
      </Col>
    </Row>
  </div>
);

export default GetStartedView;
