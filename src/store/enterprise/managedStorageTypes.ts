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
};
