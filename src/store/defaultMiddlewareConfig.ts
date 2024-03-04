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

import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
} from "redux-persist";

// See https://github.com/aohua/redux-state-sync/blob/master/src/syncState.js#L9-L17
// and https://github.com/aohua/redux-state-sync/issues/121
export const defaultCreateStateSyncMiddlewareConfig = {
  channel: "redux_state_sync",
};

// See https://redux-toolkit.js.org/api/getDefaultMiddleware#customizing-the-included-middleware
const defaultMiddlewareConfig = {
  serializableCheck: {
    // See https://github.com/rt2zz/redux-persist/issues/988#issuecomment-654875104
    // See https://redux-toolkit.js.org/usage/usage-guide#use-with-redux-persist
    ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
  },
  immutableCheck: false,
};

export default defaultMiddlewareConfig;
