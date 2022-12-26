/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { type SimpleErrorObject } from "@/errors/errorHelpers";
import { type FrameworkMeta } from "@/pageScript/messenger/constants";

interface FrameMeta {
  frameworks: FrameworkMeta[];
}

export interface FrameConnectionState {
  frameId: number;

  /**
   * UUID for the navigation result
   */
  navSequence: string | undefined;

  /**
   * True if the devtools have permission to access the current tab
   */
  hasPermissions: boolean;

  meta: FrameMeta | undefined;
}

export type TabState = {
  /**
   * Are we connecting to the content script?
   */
  isConnecting: boolean;

  /**
   * The frame connection state, or defaultFrameState if there was an error
   */
  frameState: FrameConnectionState;

  /**
   * The error connecting to the content script, or null.
   * @see connectToContentScript
   */
  error: SimpleErrorObject | null;
};

export type TabStateRootState = {
  tabState: TabState;
};
