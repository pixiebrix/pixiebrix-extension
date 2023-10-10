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

import { getErrorMessage } from "@/errors/errorHelpers";
import { BusinessError } from "@/errors/businessErrors";
import {
  type AuthData,
  type Integration,
  type IntegrationConfig,
} from "@/types/integrationTypes";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import implicitGrantFlow from "@/background/auth/implicitGrantFlow";
import codeGrantFlow from "@/background/auth/codeGrantFlow";

export async function launchOAuth2Flow(
  service: Integration,
  auth: IntegrationConfig
): Promise<AuthData> {
  // Reference: https://github.com/kylpo/salesforce-chrome-oauth/blob/master/index.js
  if (!service.isOAuth2) {
    throw new Error(`Service ${service.id} is not an OAuth2 service`);
  }

  const oauth2 = service.getOAuth2Context(auth.config);

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
    integration_id: service.id,
    auth_label: auth.label,
    host,
    client_id,
    authorize_url: rawAuthorizeUrl,
    token_url: rawTokenUrl,
  };

  reportEvent(Events.OAUTH2_LOGIN_START, eventPayload);

  if (isImplicitFlow) {
    console.debug("Using implicitGrantFlow because tokenUrl was not provided");
    return implicitGrantFlow(auth, oauth2);
  }

  console.debug("Using codeGrantFlow");
  try {
    const result = await codeGrantFlow(auth, oauth2);
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
