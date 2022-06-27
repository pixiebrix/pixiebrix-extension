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

import * as Yup from "yup";
import React from "react";
import servicesSlice from "@/store/servicesSlice";
import { useDispatch } from "react-redux";
import { uuidv4 } from "@/types/helpers";
import notify from "@/utils/notify";
import { persistor } from "@/options/store";
import { services } from "@/background/messenger/api";
import Form, { RenderBody, RenderSubmit } from "@/components/form/Form";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { Button } from "react-bootstrap";
import { CONTROL_ROOM_SERVICE_ID } from "@/options/pages/onboarding/onboardingConstants";

export type ControlRoomConfiguration = {
  controlRoomUrl: string;
  username: string;
  password: string;
};

const validationSchema = Yup.object().shape({
  controlRoomUrl: Yup.string().url().required(),
  username: Yup.string().required(),
  password: Yup.string().required(),
});

const { updateServiceConfig } = servicesSlice.actions;

/**
 * Form for configuring an AA Control Room using token authentication as part of onboarding.
 */
const AutomationAnywhereTokenForm: React.FunctionComponent<{
  initialValues: ControlRoomConfiguration;
}> = ({ initialValues }) => {
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

    notify.success("Successfully set up AARI!");

    await persistor.flush();

    try {
      await services.refresh();
    } catch (error) {
      notify.error({
        message:
          "Error refreshing your account configuration, please restart the browser extension",
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

export default AutomationAnywhereTokenForm;
