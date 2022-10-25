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
import { Col, Row } from "react-bootstrap";
import { useAsyncState } from "@/hooks/common";
import { useTitle } from "@/hooks/title";
import DefaultSetupCard from "@/options/pages/onboarding/DefaultSetupCard";
import { getBaseURL } from "@/services/baseService";
import { useSelector } from "react-redux";
import { selectSettings } from "@/store/settingsSelectors";
import Loader from "@/components/Loader";
import useRequiredPartnerAuth from "@/auth/useRequiredPartnerAuth";
import PartnerSetupCard from "@/options/pages/onboarding/partner/PartnerSetupCard";

const Layout: React.FunctionComponent = ({ children }) => (
  <Row className="w-100 mx-0">
    <Col className="mt-5 col-md-10 col-lg-7 col-sm-12 mx-auto">{children}</Col>
  </Row>
);

/**
 * Extension Setup Page, guiding user to link to PixieBrix or connect via partner authentication.
 *
 * See SettingsPage user-controlled settings
 *
 * @see SettingsPage
 */
const SetupPage: React.FunctionComponent = () => {
  useTitle("Setup");

  // Local override for authentication method
  const { authMethod } = useSelector(selectSettings);

  const {
    isLoading: isPartnerLoading,
    hasPartner,
    hasConfiguredIntegration,
  } = useRequiredPartnerAuth();

  const isStartUrl = location.hash.startsWith("#/start");

  const [baseURL, baseURLPending] = useAsyncState(getBaseURL, []);

  if (baseURLPending || isPartnerLoading) {
    return (
      <Layout>
        <Loader />
      </Layout>
    );
  }

  let setupCard = <DefaultSetupCard installURL={baseURL} />;

  if (authMethod === "pixiebrix-token") {
    // NOP -- user has overridden to use PixieBrix token even though they might be connected to an organization
    // that uses a Control Room
  } else if (
    isStartUrl ||
    (hasPartner && !hasConfiguredIntegration) ||
    // The user has overridden to use the partner auth even though they might be linked via PixieBrix token
    authMethod === "partner-token" ||
    authMethod === "partner-oauth2"
  ) {
    setupCard = <PartnerSetupCard />;
  }

  return <Layout>{setupCard}</Layout>;
};

export default SetupPage;
