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
 * The default URL of the app, e.g., https://app.pixiebrix.com.
 *
 * Developers/testers can override in AdvancedSettings. Use `getBaseURL` in any places where API calls to the backend
 * are constructed.
 *
 * @see getBaseURL
 * @see AdvancedSettings
 */
export const DEFAULT_SERVICE_URL = process.env.SERVICE_URL!; // The build fails if this is undefined, so `!` is appropriate;

/**
 * URL of the marketplace, including `/marketplace/` path, e.g., https://www.pixiebrix.com/marketplace/
 */
// @typescript-eslint/no-unnecessary-type-assertion -- The build fails if this is undefined, so `!` is appropriate
export const MARKETPLACE_URL = process.env.MARKETPLACE_URL!;

/**
 * URL to show the user when they uninstall the browser extension.
 */
export const UNINSTALL_URL = "https://www.pixiebrix.com/uninstall/";
