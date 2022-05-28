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
import { getBaseURL } from "@/services/baseService";
import { useAsyncState } from "@/hooks/common";
import Loader from "@/components/Loader";

import { useTitle } from "@/hooks/title";
import DefaultSetupCard from "@/options/pages/onboarding/DefaultSetupCard";
import PartnerSetupCard from "@/options/pages/onboarding/PartnerSetupCard";
import { useRequiredAuth, useRequiredPartnerAuth } from "@/auth/RequireAuth";

// eslint-disable-next-line prefer-destructuring -- It breaks EnvironmentPlugin
const SERVICE_URL = process.env.SERVICE_URL;

const SetupPage: React.FunctionComponent = () => {
  useTitle("Setup");
  const {
    hasPartner,
    hasRequiredIntegration,
    hasConfiguredIntegration,
    isLoading: isPartnerLoading,
  } = useRequiredPartnerAuth();
  const { isAccountUnlinked } = useRequiredAuth();

  const [accountTab, accountPending] = useAsyncState(async () => {
    const accountTabs = await browser.tabs.query({
      url: [
        new URL("setup", SERVICE_URL).toString(),
        new URL("start", SERVICE_URL).toString(),
      ],
    });

    // Close previous tab(s) in the app, if found
    await browser.tabs.remove(accountTabs.map((tab) => tab.id));
    return accountTabs.length > 0;
  }, []);
  const [installURL, installURLPending] = useAsyncState(async () => {
    const url = new URL(await getBaseURL());
    url.searchParams.set("install", "1");
    return url.toString();
  }, []);

  // Don't render anything, just visit app
  if (accountTab) {
    location.replace(installURL);
    return null;
  }

  const setupCard = hasPartner ? (
    <PartnerSetupCard
      installURL={installURL}
      isAccountUnlinked={isAccountUnlinked}
      needsConfiguration={
        !hasRequiredIntegration ||
        (hasRequiredIntegration && !hasConfiguredIntegration)
      }
    />
  ) : (
    <DefaultSetupCard installURL={installURL} />
  );

  return (
    <Row className="w-100 mx-0">
      <Col className="mt-5 col-md-10 col-lg-7 col-sm-12 mx-auto">
        {accountPending || installURLPending || isPartnerLoading ? (
          <Loader />
        ) : (
          setupCard
        )}
      </Col>
    </Row>
  );
};

export default SetupPage;
