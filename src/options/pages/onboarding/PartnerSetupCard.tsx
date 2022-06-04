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
import { Button } from "react-bootstrap";
import OnboardingChecklistCard, {
  OnboardingStep,
} from "@/components/onboarding/OnboardingChecklistCard";
import { useGetMeQuery } from "@/services/api";
import servicesSlice from "@/store/servicesSlice";
import { uuidv4 } from "@/types/helpers";
import { GridLoader } from "react-spinners";
import notify from "@/utils/notify";
import { persistor } from "@/options/store";
import { services } from "@/background/messenger/api";
import { useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import * as Yup from "yup";
import Form, { RenderBody, RenderSubmit } from "@/components/form/Form";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";

const CONTROL_ROOM_SERVICE_ID = "automation-anywhere/control-room";

type ControlRoomConfiguration = {
  controlRoomUrl: string;
  username: string;
  password: string;
};

const validationSchema = Yup.object().shape({
  controlRoomUrl: Yup.string().url().required(),
  username: Yup.string().required(),
  password: Yup.string().required(),
});

const AutomationAnywhereControlRoomForm: React.FunctionComponent<{
  initialValues: ControlRoomConfiguration;
}> = ({ initialValues }) => {
  const { updateServiceConfig } = servicesSlice.actions;
  const dispatch = useDispatch();

  const handleSubmit = async (formValues: ControlRoomConfiguration) => {
    dispatch(
      updateServiceConfig({
        id: uuidv4(),
        serviceId: CONTROL_ROOM_SERVICE_ID,
        label: "My AA Control Room",
        config: formValues,
      })
    );

    notify.success("Successfully set up PixieBrix!");

    await persistor.flush();

    try {
      await services.refresh();
    } catch (error) {
      notify.error({
        message:
          "Error refreshing your account configuration, please restart the PixieBrix extension",
        error,
      });
    }
  };

  const renderBody: RenderBody = () => (
    <>
      <ConnectedFieldTemplate
        name="controlRoomUrl"
        label="Control Room URL"
        type="text"
      />
      <ConnectedFieldTemplate name="username" label="Username" type="text" />
      <ConnectedFieldTemplate
        name="password"
        label="Password"
        type="password"
      />
    </>
  );

  const renderSubmit: RenderSubmit = ({ isSubmitting, isValid }) => (
    <div className="text-right">
      <Button type="submit" disabled={isSubmitting || !isValid}>
        Connect
      </Button>
    </div>
  );

  return (
    <Form
      validationSchema={validationSchema}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      renderBody={renderBody}
      renderSubmit={renderSubmit}
    />
  );
};

const PartnerSetupCard: React.FunctionComponent<{
  installURL: string;
  isAccountUnlinked: boolean;
  needsConfiguration: boolean;
}> = ({ installURL, isAccountUnlinked, needsConfiguration }) => {
  const { data: me, isLoading } = useGetMeQuery();

  const initialValues: ControlRoomConfiguration = {
    controlRoomUrl: me?.organization?.control_room?.url ?? "",
    username: "",
    password: "",
  };

  return (
    <OnboardingChecklistCard title="Set up your account">
      <OnboardingStep
        number={1}
        title={
          isAccountUnlinked
            ? "Create or link a PixieBrix account"
            : "PixieBrix account created/linked"
        }
        active={isAccountUnlinked}
        completed={!isAccountUnlinked}
      >
        <Button
          role="button"
          className="btn btn-primary mt-2"
          href={installURL}
        >
          <FontAwesomeIcon icon={faLink} /> Create/link PixieBrix account
        </Button>
      </OnboardingStep>
      <OnboardingStep
        number={2}
        title="PixieBrix browser extension installed"
        completed
      />
      <OnboardingStep
        number={3}
        title="Connect your AARI account"
        active={!isAccountUnlinked && needsConfiguration}
        completed={!needsConfiguration}
      >
        {isLoading ? (
          <GridLoader />
        ) : (
          <AutomationAnywhereControlRoomForm initialValues={initialValues} />
        )}
      </OnboardingStep>
    </OnboardingChecklistCard>
  );
};

export default PartnerSetupCard;
