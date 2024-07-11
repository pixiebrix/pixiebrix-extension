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

import React, { useCallback, useContext } from "react";
import { uuidv4 } from "@/types/helpers";
import { launchAuthIntegration } from "@/background/messenger/api";
import Form, {
  type RenderBody,
  type RenderSubmit,
} from "@/components/form/Form";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { Button } from "react-bootstrap";
import * as Yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import { selectIntegrationConfigs } from "@/integrations/store/integrationsSelectors";
import integrationsSlice from "@/integrations/store/integrationsSlice";
import { selectSettings } from "@/store/settings/settingsSelectors";
import { type FormikHelpers } from "formik";
import { getErrorMessage } from "@/errors/errorHelpers";
import { isEqual } from "lodash";
import { normalizeControlRoomUrl } from "@/extensionConsole/pages/onboarding/partner/partnerOnboardingUtils";
import { useHistory, useLocation } from "react-router";
import { collectIntegrationOriginPermissions } from "@/integrations/util/permissionsHelpers";
import { ensurePermissionsFromUserGesture } from "@/permissions/permissionsUtils";
import ReduxPersistenceContext from "@/store/ReduxPersistenceContext";
import {
  type IntegrationConfig,
  type SecretsConfig,
} from "@/integrations/integrationTypes";
import { CONTROL_ROOM_OAUTH_INTEGRATION_ID } from "@/integrations/constants";

const { upsertIntegrationConfig } = integrationsSlice.actions;

const AA_STAGING_ENVIRONMENT = "staging";
const AA_STAGING_AUTHCONFIG_ORIGIN =
  "https://stagingoauthconfigapp.automationanywhere.digital";
const AA_STAGING_CLIENT_ID = "pPKQkwemq9HIKcRBRAPFcC4nGEienNEY";

type ControlRoomConfiguration = {
  controlRoomUrl: string;
  authConfigOrigin?: string;
  clientId?: string;
};

const validationSchema = Yup.object().shape({
  controlRoomUrl: Yup.string()
    .required()
    .when([], {
      // Yup url check doesn't allow localhost. Allow localhost during development
      is: () => process.env.NODE_ENV === "development",
      otherwise: (schema) => schema.url(),
    }),
  authConfigOrigin: Yup.string().url(),
  clientId: Yup.string(),
});

const ControlRoomOAuthForm: React.FunctionComponent<{
  initialValues: ControlRoomConfiguration;
}> = ({ initialValues }) => {
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();
  const integrationConfigs = useSelector(selectIntegrationConfigs);
  const { flush: flushReduxPersistence } = useContext(ReduxPersistenceContext);

  const searchParams = new URLSearchParams(location.search);
  const env = searchParams.get("env");

  if (env === AA_STAGING_ENVIRONMENT) {
    initialValues = {
      ...initialValues,
      authConfigOrigin: AA_STAGING_AUTHCONFIG_ORIGIN,
      clientId: AA_STAGING_CLIENT_ID,
    };
  }

  const { authIntegrationId: authIntegrationIdOverride } =
    useSelector(selectSettings);

  // `authServiceIdOverride` can be null/empty, so defaulting in the settings destructuring doesn't work
  const authIntegrationId =
    authIntegrationIdOverride || CONTROL_ROOM_OAUTH_INTEGRATION_ID;

  const connect = useCallback(
    async (
      values: ControlRoomConfiguration,
      helpers: FormikHelpers<ControlRoomConfiguration>,
    ) => {
      try {
        const existingIntegrationConfig = integrationConfigs.find(
          (x) => x.integrationId === authIntegrationId,
        );
        let configId = existingIntegrationConfig?.id;
        const secretsConfig = {
          controlRoomUrl: normalizeControlRoomUrl(values.controlRoomUrl),
          authConfigOrigin: values.authConfigOrigin,
          clientId: values.clientId,
        } as unknown as SecretsConfig;

        // Upsert the service configuration if it doesn't already exist or if the secrets config has changed
        if (
          !configId ||
          !isEqual(existingIntegrationConfig?.config, secretsConfig)
        ) {
          configId ??= uuidv4();
          const newIntegrationConfig = {
            id: configId,
            integrationId: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
            label: "Primary Automation Co-Pilot Account",
            config: secretsConfig,
          } as IntegrationConfig;

          dispatch(upsertIntegrationConfig(newIntegrationConfig));

          // Ensure the service is available to background page (where launchAuthIntegration runs)
          await flushReduxPersistence();
        }

        // Ensure PixieBrix can call the Control Room and OAuth2 endpoints
        const requiredPermissions = await collectIntegrationOriginPermissions({
          integrationId: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
          configId,
        });

        console.debug("Required permissions", requiredPermissions);

        await ensurePermissionsFromUserGesture(requiredPermissions);

        await launchAuthIntegration({ integrationId: authIntegrationId });

        // Redirect to blueprints screen. The SetupPage always shows a login screen for the "/start" URL
        history.push("/");

        // This is a hack - refresh the page so that 1) the user appears as logged in the UI in the navbar, and 2)
        // the Admin Console link in the navbar links to the URL required for JWT hand-off.
        // See useRequiredAuth hook for more details
        history.go(0);
      } catch (error) {
        helpers.setStatus(getErrorMessage(error));
      }
    },
    [
      integrationConfigs,
      authIntegrationId,
      history,
      dispatch,
      flushReduxPersistence,
    ],
  );

  const renderBody: RenderBody = () => (
    <>
      <ConnectedFieldTemplate
        name="controlRoomUrl"
        label="Control Room URL"
        type="text"
        description="Your Automation Anywhere Control Room URL, including https://"
      />
      {env === AA_STAGING_ENVIRONMENT && (
        <>
          <ConnectedFieldTemplate
            name="authConfigOrigin"
            label="AuthConfig App URL"
            type="text"
            description="The AuthConfig Application URL"
          />
          <ConnectedFieldTemplate
            name="clientId"
            label="Client ID"
            type="text"
            description="The OAuth 2.0 client ID"
          />
        </>
      )}
    </>
  );

  const renderSubmit: RenderSubmit = ({ isSubmitting, isValid }) => (
    <div className="text-left">
      <Button type="submit" disabled={isSubmitting || !isValid}>
        Connect
      </Button>
    </div>
  );

  return (
    <Form
      validationSchema={validationSchema}
      initialValues={initialValues}
      onSubmit={connect}
      renderBody={renderBody}
      renderSubmit={renderSubmit}
    />
  );
};

export default ControlRoomOAuthForm;
