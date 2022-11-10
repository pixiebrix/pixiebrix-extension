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

import React, { useEffect } from "react";
import OnboardingChecklistCard, {
  OnboardingStep,
} from "@/components/onboarding/OnboardingChecklistCard";
import ControlRoomOAuthForm from "@/options/pages/onboarding/partner/ControlRoomOAuthForm";
import ControlRoomTokenForm from "@/options/pages/onboarding/partner/ControlRoomTokenForm";
import { selectSettings } from "@/store/settingsSelectors";
import { useGetMeQuery } from "@/services/api";
import { useDispatch, useSelector } from "react-redux";
import { selectIsLoggedIn } from "@/auth/authSelectors";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import { useAsyncState } from "@/hooks/common";
import { getBaseURL } from "@/services/baseService";
import settingsSlice from "@/store/settingsSlice";
import { ManualStorageKey, readStorage } from "@/chrome";
import { useLocation } from "react-router";

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
 * Helper method to decide partner authentication method given local settings overrides, and current login state.
 */
function usePartnerLoginMode(): "token" | "oauth2" {
  const { authMethod } = useSelector(selectSettings);
  const hasCachedLoggedIn = useSelector(selectIsLoggedIn);

  switch (authMethod) {
    case "partner-token": {
      return "token";
    }

    case "partner-oauth2": {
      return "oauth2";
    }

    case "pixiebrix-token": {
      throw new Error(
        "Unexpected authMode 'pixiebrix-token' for usePartnerLoginMode"
      );
    }

    default: {
      // If the user is logged in using PixieBrix, show the token configuration screen. They'll keep using their
      // PixieBrix token login instead of switching to the AA JWT login
      return hasCachedLoggedIn ? "token" : "oauth2";
    }
  }
}

const CONTROL_ROOM_URL_MANAGED_KEY = "controlRoomUrl" as ManualStorageKey;

function hostnameToUrl(hostname: string): string {
  if (hostname == null) {
    // Give hint to user to include https: scheme
    return "https://";
  }

  if (/^[\da-z]+:\/\//.test(hostname)) {
    return hostname;
  }

  return `https://${hostname}`;
}

/**
 * A card to set up a required partner integration.
 *
 * Currently, supports the Automation Anywhere partner integration.
 */
const PartnerSetupCard: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  // Make sure to use useLocation because the location.search are on the hash route
  const location = useLocation();
  const mode = usePartnerLoginMode();
  const { data: me } = useGetMeQuery();
  const { installURL } = useInstallUrl();

  // Hostname passed from manual flow during manual setup initiated via Control Room link
  const hostname = new URLSearchParams(location.search).get("hostname");

  // Prefer controlRoomUrl set by IT for force-installed extensions
  const fallbackControlRoomUrl =
    hostnameToUrl(hostname) ?? me?.organization?.control_room?.url ?? "";
  const [controlRoomUrl] = useAsyncState(
    async () => {
      try {
        return (
          (await readStorage(
            CONTROL_ROOM_URL_MANAGED_KEY,
            undefined,
            "managed"
          )) ?? fallbackControlRoomUrl
        );
      } catch {
        return fallbackControlRoomUrl;
      }
    },
    [fallbackControlRoomUrl],
    fallbackControlRoomUrl
  );

  const initialValues = {
    controlRoomUrl,
    username: "",
    password: "",
  };

  useEffect(() => {
    // Ensure the partner branding is applied
    dispatch(
      settingsSlice.actions.setPartnerId({
        partnerId: "automation-anywhere",
      })
    );
  }, [dispatch]);

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
          <ControlRoomOAuthForm
            initialValues={initialValues}
            key={controlRoomUrl}
          />
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
        <ControlRoomTokenForm
          initialValues={initialValues}
          key={controlRoomUrl}
        />
      </OnboardingStep>
    </OnboardingChecklistCard>
  );
};

export default PartnerSetupCard;
