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

import React, { useContext } from "react";
import Page from "@/layout/Page";
import { faCogs } from "@fortawesome/free-solid-svg-icons";
import AuthContext from "@/auth/AuthContext";
import PrivacySettings from "@/options/pages/settings/PrivacySettings";
import LoggingSettings from "@/options/pages/settings/LoggingSettings";
import PermissionsSettings from "@/options/pages/settings/PermissionsSettings";
import FactoryResetSettings from "@/options/pages/settings/FactoryResetSettings";
import AdvancedSettings from "@/options/pages/settings/AdvancedSettings";
import { Col, Row } from "react-bootstrap";
import ExperimentalSettings from "@/options/pages/settings/ExperimentalSettings";

// eslint-disable-next-line prefer-destructuring -- process.env substitution
const DEBUG = process.env.DEBUG;

const Section: React.FunctionComponent = ({ children }) => (
  <Row className="mb-4">
    <Col lg={6} md={8}>
      {children}
    </Col>
  </Row>
);

const SettingsPage: React.FunctionComponent = () => {
  const { organization, flags } = useContext(AuthContext);

  return (
    <Page
      icon={faCogs}
      title="Extension Settings"
      description={
        <p>
          Settings for the PixieBrix browser extension. To edit the settings for
          your PixieBrix account, visit the{" "}
          <a href="https://app.pixiebrix.com/settings">
            Account Settings web page
          </a>
        </p>
      }
    >
      {(organization == null || DEBUG) && (
        <Section>
          <PrivacySettings />
        </Section>
      )}

      <Section>
        <LoggingSettings />
      </Section>

      {flags.includes("settings-experimental") && (
        <Section>
          <ExperimentalSettings />
        </Section>
      )}

      {!flags.includes("restricted-permissions") && (
        <Section>
          <PermissionsSettings />
        </Section>
      )}

      {!flags.includes("restricted-reset") && (
        <Section>
          <FactoryResetSettings />
        </Section>
      )}

      <Section>
        <AdvancedSettings />
      </Section>
    </Page>
  );
};

export default SettingsPage;
