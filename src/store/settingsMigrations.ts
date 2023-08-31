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

import { type MigrationManifest } from "redux-persist/es/types";

/**
 * Migrations for the settings state based on the version found in the config.
 * The keys represent the version number that the state is coming from. At the end of each migration,
 * the version increments until it runs the version in the config.
 * https://github.com/rt2zz/redux-persist#migrations
 */
const settingsMigrations: MigrationManifest = {
  // Default the variable autosuggest to true after we take it out of beta
  1: (state) => ({ ...state, varAutosuggest: true }),
};

export default settingsMigrations;
