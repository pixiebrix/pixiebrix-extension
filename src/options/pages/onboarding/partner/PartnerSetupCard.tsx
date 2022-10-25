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

import React, { useState } from "react";
import OnboardingChecklistCard, {
  OnboardingStep,
} from "@/components/onboarding/OnboardingChecklistCard";
import ControlRoomOAuthForm from "@/options/pages/onboarding/partner/ControlRoomOAuthForm";
import ControlRoomTokenForm from "@/options/pages/onboarding/partner/ControlRoomTokenForm";
import { useGetMeQuery } from "@/services/api";
import { useDispatch, useSelector } from "react-redux";
import { selectIsLoggedIn } from "@/auth/authSelectors";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import { useAsyncState } from "@/hooks/common";
import { getBaseURL } from "@/services/baseService";
import { useLocation } from "react-router";
import settingsSlice from "@/store/settingsSlice";

function useInstallUrl() {
  const { data: me } = useGetMeQuery();

  const controlRoomUrl = me?.organization?.control_room?.url;

  const [installURL, isPending] = useAsyncState(async () => {
    const baseUrl = await getBaseURL();
    const startUrl = new URL(`${baseUrl}start`);

    if (controlRoomUrl) {
      const parsedControlRoomUrl = new URL(controlRoomUrl);
      startUrl.searchParams.set("hostname", parsedControlRoomUrl.hostname);
    }

    startUrl.searchParams.set("partner", "automation-anywhere");
    return startUrl.href;
  }, [controlRoomUrl]);

  return {
    installURL,
    isPending,
  };
}

/**
 * A card to set up a required partner integration.
 *
 * Currently, supports the Automation Anywhere partner integration.
 */
const PartnerSetupCard: React.FunctionComponent = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const hostname = new URLSearchParams(location.search).get("hostname");
  const hasCachedLoggedIn = useSelector(selectIsLoggedIn);

  // If the user is logged in, show the token configuration screen. They'll keep using their PixieBrix login instead
  // of switching to the AA JWT login
  const [mode] = useState(hasCachedLoggedIn ? "token" : "oauth2");
  const { data: me } = useGetMeQuery();
  const { installURL } = useInstallUrl();

  // TODO: prefer managed storage for the Control Room URL
  const controlRoomUrl = hostname ?? me?.organization?.control_room?.url ?? "";
  const initialValues = {
    controlRoomUrl,
    username: "",
    password: "",
  };

  dispatch(
    settingsSlice.actions.setPartnerId({
      partnerId: "automation-anywhere",
    })
  );

  if (mode === "oauth2") {
    // For OAuth2, there's only 2 steps because the AA JWT is also used to communicate with the PixieBrix server
    return (
      <OnboardingChecklistCard title="Set up your account">
        <OnboardingStep
          number={1}
          title="Browser Extension installed"
          completed
        />
        <OnboardingStep number={2} title="Connect your AARI account" active>
          <ControlRoomOAuthForm initialValues={initialValues} />
        </OnboardingStep>
      </OnboardingChecklistCard>
    );
  }

  if (!me?.id) {
    return (
      <OnboardingChecklistCard title="Set up your account">
        <OnboardingStep
          number={1}
          title="Browser Extension installed"
          completed
        />
        <OnboardingStep
          number={2}
          title="Link the extension to a PixieBrix account"
          active
        >
          <Button className="btn btn-primary mt-2" href={installURL}>
            <FontAwesomeIcon icon={faLink} /> Create/link PixieBrix account
          </Button>
        </OnboardingStep>
        <OnboardingStep number={3} title="Connect your AARI account" />
      </OnboardingChecklistCard>
    );
  }

  return (
    <OnboardingChecklistCard title="Set up your account">
      <OnboardingStep
        number={1}
        title="Browser Extension installed"
        completed
      />
      <OnboardingStep
        number={2}
        title="Link the extension to a PixieBrix account"
        completed
      />
      <OnboardingStep number={3} title="Connect your AARI account" active>
        <ControlRoomTokenForm initialValues={initialValues} />
      </OnboardingStep>
    </OnboardingChecklistCard>
  );
};

export default PartnerSetupCard;
