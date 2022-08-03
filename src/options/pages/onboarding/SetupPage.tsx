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
import { getInstallURL } from "@/services/baseService";
import { useAsyncState } from "@/hooks/common";

import { useTitle } from "@/hooks/title";
import DefaultSetupCard from "@/options/pages/onboarding/DefaultSetupCard";
import useRequiredPartnerAuth from "@/auth/useRequiredPartnerAuth";
import { useSelector } from "react-redux";
import { selectSettings } from "@/store/settingsSelectors";
import PartnerOAuthSetupCard from "@/options/pages/onboarding/PartnerOAuthSetupCard";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import { isEmpty } from "lodash";
import Loader from "@/components/Loader";

const SetupPage: React.FunctionComponent = () => {
  useTitle("Setup");
  const { isLoading: isPartnerLoading } = useRequiredPartnerAuth();

  const { authServiceId } = useSelector(selectSettings);

  const [installURL, installURLPending] = useAsyncState(getInstallURL, []);

  if (installURLPending || isPartnerLoading) {
    return (
      <Row className="w-100 mx-0">
        <Col className="mt-5 col-md-10 col-lg-7 col-sm-12 mx-auto">
          <Loader />
        </Col>
      </Row>
    );
  }

  let setupCard = <DefaultSetupCard installURL={installURL} />;

  if (!isEmpty(authServiceId) && authServiceId !== PIXIEBRIX_SERVICE_ID) {
    setupCard = <PartnerOAuthSetupCard />;
  }

  return (
    <Row className="w-100 mx-0">
      <Col className="mt-5 col-md-10 col-lg-7 col-sm-12 mx-auto">
        {setupCard}
      </Col>
    </Row>
  );
};

export default SetupPage;
