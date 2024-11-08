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
import Page from "../../../layout/Page";
import { faCogs } from "@fortawesome/free-solid-svg-icons";
import PrivacySettings from "./PrivacySettings";
import LoggingSettings from "./LoggingSettings";
import FactoryResetSettings from "./FactoryResetSettings";
import AdvancedSettings from "./AdvancedSettings";
import ExperimentalSettings from "./ExperimentalSettings";
import useFlags from "../../../hooks/useFlags";
import { selectOrganization } from "../../../auth/authSelectors";
import { useSelector } from "react-redux";
import StorageSettings from "./StorageSettings";
import GeneralSettings from "./GeneralSettings";
import { FeatureFlags, RestrictedFeatures } from "../../../auth/featureFlags";
import { type EmptyObject } from "type-fest";

// eslint-disable-next-line prefer-destructuring -- process.env substitution
const DEBUG = process.env.DEBUG;

const Section: React.FunctionComponent<
  React.PropsWithChildren<EmptyObject>
> = ({ children }) => <div className="mb-4">{children}</div>;

const SettingsPage: React.FunctionComponent = () => {
  const organization = useSelector(selectOrganization);

  const { flagOn, permit } = useFlags();

  return (
    <Page
      className="max-550"
      icon={faCogs}
      title="Extension Settings"
      documentationUrl="https://docs.pixiebrix.com/platform-overview/extension-console#settings"
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
      {flagOn(FeatureFlags.FLOATING_ACTION_BUTTON_FREEMIUM) && (
        <Section>
          <GeneralSettings />
        </Section>
      )}

      {(organization == null || DEBUG) && (
        <Section>
          <PrivacySettings />
        </Section>
      )}

      <Section>
        <LoggingSettings />
      </Section>

      {flagOn(FeatureFlags.SETTINGS_EXPERIMENTAL) && (
        <Section>
          <ExperimentalSettings />
        </Section>
      )}

      {flagOn(FeatureFlags.SETTINGS_STORAGE) && (
        <Section>
          <StorageSettings />
        </Section>
      )}

      {permit(RestrictedFeatures.FACTORY_RESET) && (
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
