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

import type { ValueOf } from "type-fest";
import type { UUID } from "@/types/stringTypes";
import type { RegistryId } from "@/types/registryTypes";

export const MergeStrategies = {
  SHALLOW: "shallow",
  REPLACE: "replace",
  DEEP: "deep",
} as const;

export type MergeStrategy = ValueOf<typeof MergeStrategies>;

export const StateNamespaces = {
  MOD: "blueprint",
  PRIVATE: "extension",
  PUBLIC: "shared",
} as const;

export type StateNamespace = ValueOf<typeof StateNamespaces>;

/**
 * [Experimental] policy to sync state changes across frames/tabs.
 * @since 2.1.3
 */
export const SyncPolicies = {
  NONE: "none",
  SESSION: "session",
};

export type SyncPolicy = ValueOf<typeof SyncPolicies>;

/**
 * JavaScript event name fired for state change events.
 */
export const STATE_CHANGE_JS_EVENT_TYPE = "statechange" as const;

/**
 * Event detail fired when mod state changes.
 */
export type StateChangeEventDetail = {
  namespace: StateNamespace;
  // TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/8845 -- rename deprecated fieldnames
  // Keep using extensionId/blueprintId for now for backward compatability because the values are made available
  // in `@input.event`. It's unlikely anyone is relying on them in the wild, though.
  blueprintId: RegistryId;
  extensionId?: UUID;
};

/**
 * Returns true if the event is a state change event.
 * @see StateChangeEventDetail
 */
export function isStateChangeEvent(
  event: Event,
): event is CustomEvent<StateChangeEventDetail> {
  return (
    event.type === STATE_CHANGE_JS_EVENT_TYPE &&
    "detail" in event &&
    "namespace" in (event as CustomEvent).detail
  );
}
