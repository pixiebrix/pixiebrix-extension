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

import { getErrorMessage } from "@/errors/errorHelpers";
import { BusinessError } from "@/errors/businessErrors";
import {
  type AuthData,
  type Integration,
  type IntegrationConfig,
} from "@/integrations/integrationTypes";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import implicitGrantFlow from "@/background/auth/implicitGrantFlow";
import codeGrantFlow from "@/background/auth/codeGrantFlow";

/**
 * Perform the OAuth2 flow for the given integration.
 * @param integration the integration, or nullish to lookup by id
 * @param integrationConfig the integration configuration
 * @param options options for the flow
 */
async function launchOAuth2Flow(
  integration: Integration,
  integrationConfig: IntegrationConfig,
  options: { interactive: boolean },
): Promise<AuthData> {
  // Reference: https://github.com/kylpo/salesforce-chrome-oauth/blob/master/index.js
  if (!integration.isOAuth2) {
    throw new Error(`Service ${integration.id} is not an OAuth2 service`);
  }

  const oauth2 = integration.getOAuth2Context(
    integrationConfig.config,
    options,
  );

  const {
    host,
    authorizeUrl: rawAuthorizeUrl,
    tokenUrl: rawTokenUrl,
    client_id,
  } = oauth2;

  // `tokenUrl` is not required for implicit flow
  if (!rawAuthorizeUrl) {
    throw new BusinessError("authorizeUrl is required for oauth2");
  }

  const isImplicitFlow = rawTokenUrl === undefined;

  const eventPayload = {
    integration_id: integration.id,
    auth_label: integrationConfig.label,
    host,
    client_id,
    authorize_url: rawAuthorizeUrl,
    token_url: rawTokenUrl,
  };

  reportEvent(Events.OAUTH2_LOGIN_START, eventPayload);

  if (isImplicitFlow) {
    console.debug("Using implicitGrantFlow because tokenUrl was not provided");
    return implicitGrantFlow(integrationConfig, oauth2, options);
  }

  console.debug("Using codeGrantFlow");
  try {
    const result = await codeGrantFlow(integrationConfig, oauth2, options);
    reportEvent(Events.OAUTH2_LOGIN_SUCCESS, eventPayload);
    return result;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.log(errorMessage);
    reportEvent(Events.OAUTH2_LOGIN_ERROR, {
      ...eventPayload,
      error_message: errorMessage,
    });
    throw error;
  }
}

export default launchOAuth2Flow;
