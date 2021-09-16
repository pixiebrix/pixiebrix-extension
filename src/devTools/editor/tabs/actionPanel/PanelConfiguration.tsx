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
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import UrlMatchPatternWidget from "@/devTools/editor/components/UrlMatchPatternWidget";
import { Card, Row } from "react-bootstrap";
import styles from "./PanelConfiguration.module.scss";

const PanelConfiguration: React.FC<{
  isLocked: boolean;
}> = ({ isLocked = false }) => (
  <Card>
    <ConnectedFieldTemplate
      name="extension.heading"
      layout="vertical"
      label={
        <Row>
          <Card.Header className={styles.cardHeader}>
            Heading
          </Card.Header>
        </Row>
      }
      description="Panel heading to show in the sidebar"
    />
    <ConnectedFieldTemplate
      name="extensionPoint.definition.isAvailable.matchPatterns"
      layout="vertical"
      as={UrlMatchPatternWidget}
      disabled={isLocked}
      label={
        <Row>
          <Card.Header className={styles.cardHeader}>
            Sites
          </Card.Header>
        </Row>
      }
      description={
        <span>
          URL match pattern for which pages to run the extension on. See{" "}
          <a
            href="https://developer.chrome.com/docs/extensions/mv2/match_patterns/"
            target="_blank"
            rel="noreferrer"
          >
            Patterns Documentation
          </a>{" "}
          for examples
        </span>
      }
    />
  </Card>
)

export default PanelConfiguration;
