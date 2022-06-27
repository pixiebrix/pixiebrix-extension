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
import OnboardingChecklistCard, {
  OnboardingStep,
} from "@/components/onboarding/OnboardingChecklistCard";
import { useDispatch, useSelector } from "react-redux";
import { selectSettings } from "@/store/settingsSelectors";
import AsyncButton from "@/components/AsyncButton";
import { launchAuthIntegration } from "@/background/messenger/api";
import { uuidv4 } from "@/types/helpers";
import { persistor } from "@/options/store";
import servicesSlice from "@/store/servicesSlice";
import { selectConfiguredServices } from "@/store/servicesSelectors";
import useUserAction from "@/hooks/useUserAction";

const { updateServiceConfig } = servicesSlice.actions;

/**
 * A Setup card for partners where the client authenticates using a OAuth2 JWT from the partner.
 * @see PartnerSetupCard
 */
const PartnerOAuthSetupCard: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const { authServiceId } = useSelector(selectSettings);
  const configuredServices = useSelector(selectConfiguredServices);

  if (authServiceId == null) {
    throw new Error("Expected authServiceId");
  }

  const launch = useUserAction(
    async () => {
      if (!configuredServices.some((x) => x.serviceId === authServiceId)) {
        dispatch(
          updateServiceConfig({
            id: uuidv4(),
            serviceId: authServiceId,
            label: "My AA Control Room",
            config: {
              controlRoom: "http://146.20.224.72",
            },
          })
        );

        await persistor.flush();
      }

      await launchAuthIntegration({ serviceId: authServiceId });
    },
    {
      successMessage: "Linked your AARI account",
      errorMessage: "Error linking your AARI account",
    },
    [authServiceId]
  );

  return (
    <OnboardingChecklistCard title="Set up your account">
      <OnboardingStep
        number={1}
        title="Browser Extension installed"
        completed
      />
      <OnboardingStep number={2} title="Connect your AARI account" active>
        <AsyncButton onClick={launch}>Connect</AsyncButton>
      </OnboardingStep>
    </OnboardingChecklistCard>
  );
};

export default PartnerOAuthSetupCard;
