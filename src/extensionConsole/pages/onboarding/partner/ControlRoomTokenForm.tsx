/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import React, { useContext } from "react";
import integrationsSlice from "@/integrations/store/integrationsSlice";
import { useDispatch, useSelector } from "react-redux";
import { uuidv4 } from "@/types/helpers";
import notify from "@/utils/notify";
import { integrationConfigLocator } from "@/background/messenger/api";
import Form, {
  type RenderBody,
  type RenderSubmit,
} from "@/components/form/Form";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { Button } from "react-bootstrap";
import { useHistory } from "react-router";
import { normalizeControlRoomUrl } from "@/extensionConsole/pages/onboarding/partner/partnerOnboardingUtils";
import { selectIntegrationConfigs } from "@/integrations/store/integrationsSelectors";
import { selectSettings } from "@/store/settings/settingsSelectors";
import { isEmpty } from "lodash";
import ReduxPersistenceContext from "@/store/ReduxPersistenceContext";
import {
  type IntegrationConfig,
  type SecretsConfig,
} from "@/integrations/integrationTypes";
import { CONTROL_ROOM_TOKEN_INTEGRATION_ID } from "@/integrations/constants";

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

/**
 * Simplified Username/password form for configuring an Automation Anywhere Control Room integration.
 */
const ControlRoomTokenForm: React.FunctionComponent<{
  initialValues: ControlRoomConfiguration;
}> = ({ initialValues }) => {
  const { upsertIntegrationConfig } = integrationsSlice.actions;
  const dispatch = useDispatch();
  const history = useHistory();
  const integrationConfigs = useSelector(selectIntegrationConfigs);
  const { flush: flushReduxPersistence } = useContext(ReduxPersistenceContext);

  const { authIntegrationId: authIntegrationIdOverride } =
    useSelector(selectSettings);

  // `authIntegrationIdOverride` can be null/empty, so defaulting in the settings destructuring doesn't work
  const authIntegrationId = isEmpty(authIntegrationIdOverride)
    ? CONTROL_ROOM_TOKEN_INTEGRATION_ID
    : authIntegrationIdOverride;

  const handleSubmit = async (formValues: ControlRoomConfiguration) => {
    // In theory, this ControlRoomTokenForm should only be shown if there's not already a configured integration.
    // In practice, the Extension Console has gotten into a state where it's shown this form even when there's already
    // an integration configured.
    // See: https://github.com/pixiebrix/pixiebrix-extension/issues/5762
    const integrationConfig = integrationConfigs.find(
      (x) => x.integrationId === authIntegrationId,
    );

    const newIntegrationConfig = {
      // Use existing if available, otherwise generate a new ID
      id: integrationConfig?.id ?? uuidv4(),
      integrationId: authIntegrationId,
      label: "Primary AA Control Room",
      config: {
        ...formValues,
        controlRoomUrl: normalizeControlRoomUrl(formValues.controlRoomUrl),
      } as unknown as SecretsConfig,
    } as IntegrationConfig;

    dispatch(upsertIntegrationConfig(newIntegrationConfig));

    notify.success("Successfully connected Automation Anywhere!");

    await flushReduxPersistence();

    try {
      await integrationConfigLocator.refresh();

      // Redirect to blueprints screen. The SetupPage will always show a login screen for the "/start" URL
      history.push("/");
    } catch (error) {
      notify.error({
        message:
          "Error refreshing your account configuration, please reload the browser extension",
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
        description="Your Automation Anywhere Control Room URL, including https://"
      />
      <ConnectedFieldTemplate
        name="username"
        label="Username"
        type="text"
        autoComplete="off"
      />
      <ConnectedFieldTemplate
        name="password"
        label="Password"
        type="password"
        autoComplete="off"
      />
    </>
  );

  const renderSubmit: RenderSubmit = ({ isSubmitting, isValid }) => (
    <div className="left">
      <Button
        type="submit"
        disabled={isSubmitting || !isValid}
        data-testid="connect-aa-copilot-token-btn"
      >
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

export default ControlRoomTokenForm;
