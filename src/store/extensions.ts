/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { MigrationManifest, PersistedState } from "redux-persist/es/types";
import { migrateOptionsState, OptionsState } from "@/options/slices";
import { localStorage } from "redux-persist-webextension-storage";
import { createMigrate } from "redux-persist";
import { boolean } from "@/utils";

const migrations: MigrationManifest = {
  1: (state: PersistedState & OptionsState) => migrateOptionsState(state),
};

export const persistOptionsConfig = {
  key: "extensionOptions",
  storage: localStorage,
  version: 1,
  // https://github.com/rt2zz/redux-persist#migrations
  migrate: createMigrate(migrations, { debug: boolean(process.env.DEBUG) }),
};
