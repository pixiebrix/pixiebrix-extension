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

import { DeploymentKey } from "@/auth/authTypes";

/**
 * The managed storage state is stored in the browser's managed storage area. Configured by the Enterprise IT department
 * as part of force install of the extension.
 *
 * See managedStorageSchema.json
 */
export type ManagedStorageState = {
  /**
   * PixieBrix organization ID the extension should link to
   */
  managedOrganizationId?: string;
  /**
   * If true, the Extension will restrict access to certain urls for unauthenticated users. Url match patterns are
   * stored on the server per `managedOrganizationId`.
   *
   * @since 1.8.8
   * @see restrictUnauthenticatedUrlAccess.ts
   */
  enforceAuthentication?: boolean;
  /**
   * If true, the extension will not open a login tab on install or on heartbeat if unauthenticated.
   *
   * @since 1.8.9
   */
  disableLoginTab?: boolean;
  /**
   * PixieBrix partner ID
   */
  partnerId?: string;
  /**
   * Automation Anywhere Control Room URL specified by IT department
   */
  controlRoomUrl?: string;
  /**
   * The campaign IDs the user is a part of (if any). Used for analytics when the user has not authenticated
   * @deprecated
   */
  campaignIds?: string[];
  /**
   * The SSO URL for automatically performing SSO/SAML authentication.
   */
  ssoUrl?: string;
  /**
   * PixieBrix service URL
   */
  serviceUrl?: string;
  /**
   * Shared deployment key for receiving deployments without user-authentication.
   * @since 2.0.6
   */
  deploymentKey?: DeploymentKey;
  /**
   * Disable the browser warning for non-Chrome browsers, e.g., Microsoft Edge
   * @since 1.7.36
   */
  disableBrowserWarning?: boolean;
};
