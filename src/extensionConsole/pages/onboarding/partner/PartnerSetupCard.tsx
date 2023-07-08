/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import ControlRoomOAuthForm from "@/extensionConsole/pages/onboarding/partner/ControlRoomOAuthForm";
import ControlRoomTokenForm from "@/extensionConsole/pages/onboarding/partner/ControlRoomTokenForm";
import { selectSettings } from "@/store/settingsSelectors";
import { appApi } from "@/services/api";
import { useDispatch, useSelector } from "react-redux";
import { selectIsLoggedIn } from "@/auth/authSelectors";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import { getBaseURL } from "@/services/baseService";
import settingsSlice from "@/store/settingsSlice";
import { useLocation } from "react-router";
import {
  hostnameToUrl,
  isCommunityControlRoom,
} from "@/contrib/automationanywhere/aaUtils";
import useAsyncState from "@/hooks/useAsyncState";
import useManagedStorageState from "@/store/enterprise/useManagedStorageState";
import { type FetchableAsyncState } from "@/types/sliceTypes";

/**
 * Create the app URL for the partner start page. It shows content based on whether or not the hostname corresponds
 * to a linked Control Room.
 */
function usePartnerAppStartUrl(
  controlRoomUrl: string
): FetchableAsyncState<string> {
  return useAsyncState(async () => {
    const baseUrl = await getBaseURL();
    // Special login/base screen for partner users
    const startUrl = new URL("/start", baseUrl);

    if (controlRoomUrl) {
      const parsedControlRoomUrl = new URL(controlRoomUrl);
      startUrl.searchParams.set("hostname", parsedControlRoomUrl.hostname);
    }

    // Include the partner to ensure branding is applied
    startUrl.searchParams.set("partner", "automation-anywhere");
    return startUrl.href;
  }, [controlRoomUrl]);
}

/**
 * Helper method to decide partner authentication method given local settings overrides, and current login state.
 *
 * @see useRequiredPartnerAuth
 */
function usePartnerLoginMode(): "token" | "oauth2" {
  // WARNING: the logic in this method must match the logic in useRequiredPartnerAuth, otherwise logging in using
  // the method determined here will not result in the user passing the partner auth gate.

  // Make sure to use useLocation because the location.search are on the hash route
  const location = useLocation();

  const { authMethod } = useSelector(selectSettings);
  const hasCachedNativeLogin = useSelector(selectIsLoggedIn);

  // Hostname passed from manual flow during manual setup initiated via Control Room link
  const hostname = new URLSearchParams(location.search).get("hostname");

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
      // If the user is logged in using PixieBrix, show the AA token configuration screen. They'll keep using their
      // PixieBrix token login instead of switching to the AA JWT login
      return hasCachedNativeLogin || isCommunityControlRoom(hostname)
        ? "token"
        : "oauth2";
    }
  }
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
  const { data: me } = appApi.endpoints.getMe.useQueryState();
  const managedStorage = useManagedStorageState();

  // Hostname passed from manual flow during manual setup initiated via Control Room link
  const hostname = new URLSearchParams(location.search).get("hostname");

  // Prefer control room url set by IT for force-installed extensions
  // In order of preference
  // 1. Value set by IT department in the registry
  // 2. Hostname from URL (when using /start URL from Admin Console)
  // 3. Cached control room url
  const controlRoomUrl =
    managedStorage.data?.controlRoomUrl ??
    hostnameToUrl(hostname) ??
    me?.organization?.control_room?.url ??
    "";

  const { data: installUrl } = usePartnerAppStartUrl(controlRoomUrl);

  const initialFormValues = {
    controlRoomUrl,
    // Username/password ignored for OAuth2 flow
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
            initialValues={initialFormValues}
            // Force re-render when control room URL changes, so that the control room URL will be pre-filled
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
          <Button
            className="btn btn-primary mt-2"
            // The async state for installUrl will be ready by the time the button is rendered/clicked
            href={installUrl}
            data-testid="link-account-btn"
          >
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
          initialValues={initialFormValues}
          key={controlRoomUrl}
        />
      </OnboardingStep>
    </OnboardingChecklistCard>
  );
};

export default PartnerSetupCard;
