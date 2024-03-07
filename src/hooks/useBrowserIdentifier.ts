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

import { getUUID, uuidStorage } from "@/telemetry/telemetryHelpers";
import useAsyncExternalStore from "@/hooks/useAsyncExternalStore";
import type { AsyncState } from "@/types/sliceTypes";
import type { UUID } from "@/types/stringTypes";

// Keep subscribe method in here for now because useAsyncExternalStore doesn't support sharing across hooks:
// https://github.com/pixiebrix/pixiebrix-extension/issues/7789
function subscribe(callback: () => void) {
  const controller = new AbortController();
  uuidStorage.onChanged(callback, controller.signal);
  return () => {
    controller.abort();
  };
}

/**
 * Watch the unique client identifier for this browser profile.
 *
 * In practice, the identifier UUID should never change during a session.
 *
 * @see getUUID
 */
function useBrowserIdentifier(): AsyncState<UUID> {
  return useAsyncExternalStore(subscribe, getUUID);
}

export default useBrowserIdentifier;
