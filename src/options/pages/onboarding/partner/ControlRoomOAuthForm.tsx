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

import React, { useCallback } from "react";
import { uuidv4 } from "@/types/helpers";
import { persistor } from "@/store/optionsStore";
import { launchAuthIntegration } from "@/background/messenger/api";
import Form, {
  type RenderBody,
  type RenderSubmit,
} from "@/components/form/Form";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { Button } from "react-bootstrap";
import * as Yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import { selectConfiguredServices } from "@/store/servicesSelectors";
import { CONTROL_ROOM_OAUTH_SERVICE_ID } from "@/services/constants";
import servicesSlice from "@/store/servicesSlice";
import { selectSettings } from "@/store/settingsSelectors";
import { type FormikHelpers } from "formik";
import { getErrorMessage } from "@/errors/errorHelpers";
import { serviceOriginPermissions } from "@/permissions";
import { requestPermissions } from "@/utils/permissions";
import { isEmpty } from "lodash";
import { util as apiUtil } from "@/services/api";
import { normalizeControlRoomUrl } from "@/options/pages/onboarding/partner/partnerOnboardingUtils";
import { useHistory } from "react-router";

const { updateServiceConfig } = servicesSlice.actions;

type ControlRoomConfiguration = {
  controlRoomUrl: string;
};

const validationSchema = Yup.object().shape({
  controlRoomUrl: Yup.string()
    .required()
    .when([], {
      // Yup url check doesn't allow localhost. Allow localhost during development
      is: () => process.env.NODE_ENV === "development",
      otherwise: (schema) => schema.url(),
    }),
});

const ControlRoomOAuthForm: React.FunctionComponent<{
  initialValues: ControlRoomConfiguration;
}> = ({ initialValues }) => {
  const dispatch = useDispatch();
  const history = useHistory();
  const configuredServices = useSelector(selectConfiguredServices);

  const { authServiceId: authServiceIdOverride } = useSelector(selectSettings);

  // `authServiceIdOverride` can be null/empty, so defaulting in the settings destructuring doesn't work
  const authServiceId = isEmpty(authServiceIdOverride)
    ? CONTROL_ROOM_OAUTH_SERVICE_ID
    : authServiceIdOverride;

  const connect = useCallback(
    async (
      values: ControlRoomConfiguration,
      helpers: FormikHelpers<ControlRoomConfiguration>
    ) => {
      try {
        const configuredService = configuredServices.find(
          (x) => x.serviceId === authServiceId
        );
        let configurationId = configuredService?.id;

        // Create the service configuration if it doesn't already exist
        if (!configurationId) {
          configurationId = uuidv4();

          dispatch(
            updateServiceConfig({
              id: configurationId,
              serviceId: CONTROL_ROOM_OAUTH_SERVICE_ID,
              label: "Primary AARI Account",
              config: {
                controlRoomUrl: normalizeControlRoomUrl(values.controlRoomUrl),
              },
            })
          );

          // Ensure the service is available to background page (where launchAuthIntegration runs)
          await persistor.flush();
        }

        // Ensure PixieBrix can call the Control Room and OAuth2 endpoints
        const requiredPermissions = await serviceOriginPermissions({
          id: CONTROL_ROOM_OAUTH_SERVICE_ID,
          config: configurationId,
        });

        console.debug("Required permissions", requiredPermissions);

        await requestPermissions(requiredPermissions);

        await launchAuthIntegration({ serviceId: authServiceId });

        // Redirect to blueprints screen. The SetupPage always shows a login screen for the "/start" URL
        history.push("/");

        // Refresh auth state so that 1) the user appears as logged in the UI in the navbar, and 2) the Admin Console
        // link in the navbar links to the URL required for JWT hand-off.
        // See useRequiredAuth hook for more details
        dispatch(apiUtil.resetApiState());
      } catch (error) {
        helpers.setStatus(getErrorMessage(error));
      }
    },
    [dispatch, history, configuredServices, authServiceId]
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
