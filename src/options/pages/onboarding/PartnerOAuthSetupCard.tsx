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

import React, { useCallback } from "react";
import OnboardingChecklistCard, {
  OnboardingStep,
} from "@/components/onboarding/OnboardingChecklistCard";
import { useDispatch, useSelector } from "react-redux";
import { selectSettings } from "@/store/settingsSelectors";
import { launchAuthIntegration } from "@/background/messenger/api";
import { uuidv4 } from "@/types/helpers";
import { persistor } from "@/options/store";
import servicesSlice from "@/store/servicesSlice";
import { selectConfiguredServices } from "@/store/servicesSelectors";
import * as Yup from "yup";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import Form, { RenderBody, RenderSubmit } from "@/components/form/Form";
import { Button } from "react-bootstrap";

const { updateServiceConfig } = servicesSlice.actions;

export type ControlRoomConfiguration = {
  controlRoomUrl: string;
};

const validationSchema = Yup.object().shape({
  controlRoomUrl: Yup.string().url().required(),
});

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

  const connect = useCallback(
    async (values: ControlRoomConfiguration) => {
      if (!configuredServices.some((x) => x.serviceId === authServiceId)) {
        dispatch(
          updateServiceConfig({
            id: uuidv4(),
            serviceId: authServiceId,
            label: "Primary AARI Account",
            config: {
              controlRoom: values.controlRoomUrl,
            },
          })
        );

        // Ensure the service is available to background page (which is where launchAuthIntegration runs)
        await persistor.flush();
      }

      await launchAuthIntegration({ serviceId: authServiceId });
    },
    [dispatch, configuredServices, authServiceId]
  );

  const renderBody: RenderBody = () => (
    <>
      <ConnectedFieldTemplate
        name="controlRoomUrl"
        label="Control Room URL"
        type="text"
        description="Your Automation Anywhere Control Room URL, including https://"
      />
    </>
  );

  const renderSubmit: RenderSubmit = ({ isSubmitting, isValid }) => (
    <div className="text-left">
      <Button type="submit" disabled={isSubmitting || !isValid}>
        Connect AARI
      </Button>
    </div>
  );

  return (
    <OnboardingChecklistCard title="Set up your account">
      <OnboardingStep
        number={1}
        title="Browser Extension installed"
        completed
      />
      <OnboardingStep number={2} title="Connect your AARI account" active>
        <Form
          validationSchema={validationSchema}
          initialValues={{
            // TODO: default Control Room URL based on onboarding flow/managed storage
            controlRoomUrl: "",
          }}
          onSubmit={connect}
          renderBody={renderBody}
          renderSubmit={renderSubmit}
        />
      </OnboardingStep>
    </OnboardingChecklistCard>
  );
};

export default PartnerOAuthSetupCard;
