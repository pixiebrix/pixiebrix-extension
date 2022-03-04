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

import styles from "./SettingsPage.module.scss";

import React from "react";
import Page from "@/layout/Page";
import { faCogs } from "@fortawesome/free-solid-svg-icons";
import { useGetAuthQuery } from "@/services/api";
import PrivacySettings from "@/options/pages/settings/PrivacySettings";
import LoggingSettings from "@/options/pages/settings/LoggingSettings";
import PermissionsSettings from "@/options/pages/settings/PermissionsSettings";
import FactoryResetSettings from "@/options/pages/settings/FactoryResetSettings";
import AdvancedSettings from "@/options/pages/settings/AdvancedSettings";
import ExperimentalSettings from "@/options/pages/settings/ExperimentalSettings";
import useFlags from "@/auth/useFlags";

// eslint-disable-next-line prefer-destructuring -- process.env substitution
const DEBUG = process.env.DEBUG;

const Section: React.FunctionComponent = ({ children }) => (
  <div className={styles.root}>{children}</div>
);

const SettingsPage: React.FunctionComponent = () => {
  const {
    data: { organization },
  } = useGetAuthQuery();

  const { flagOn, permit } = useFlags();

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

      {flagOn("settings-experimental") && (
        <Section>
          <ExperimentalSettings />
        </Section>
      )}

      {permit("permissions") && (
        <Section>
          <PermissionsSettings />
        </Section>
      )}

      {permit("reset") && (
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
