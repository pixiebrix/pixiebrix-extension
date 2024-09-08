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
  type ActivatedModComponentV1,
  type ActivatedModComponentV2,
  type ActivatedModComponentV3,
  type SerializedModComponentV1,
} from "@/types/modComponentTypes";

/**
 * @deprecated - Do not use versioned state types directly
 */
export type ModComponentStateV0 = {
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- Record doesn't allow labelled keys
  extensions: {
    // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- Record doesn't allow labelled keys
    [extensionPointId: string]: {
      [extensionId: string]: SerializedModComponentV1;
    };
  };
};

/**
 * @deprecated - Do not use versioned state types directly
 */
export type ModComponentStateV1 = {
  extensions: SerializedModComponentV1[];
};

/**
 * @deprecated - Do not use versioned state types directly
 */
export type ModComponentStateV2 = {
  extensions: ActivatedModComponentV1[];
};

/**
 * @deprecated - Do not use versioned state types directly
 */
export type ModComponentStateV3 = {
  extensions: ActivatedModComponentV2[];
};

/**
 * @deprecated - Do not use versioned state types directly
 *
 * @since 2.0.8 This type is only being used as a placeholder for the
 * migration to convert all stand-alone mod components to mod definitions
 */
export type ModComponentStateV4 = ModComponentStateV3;

/**
 * @deprecated - Do not use versioned state types directly
 */
export type ModComponentStateV5 = {
  activatedModComponents: ActivatedModComponentV2[];
};

/**
 * @deprecated - Do not use versioned state types directly
 */
export type ModComponentStateV6 = {
  activatedModComponents: ActivatedModComponentV3[];
};

export type ModComponentStateVersions =
  | ModComponentStateV0
  | ModComponentStateV1
  | ModComponentStateV2
  | ModComponentStateV3
  | ModComponentStateV5
  | ModComponentStateV6;

export type ModComponentState = ModComponentStateV6;

export type ModComponentsRootState = {
  options: ModComponentState;
};

export function isModComponentStateV0(
  state: ModComponentStateVersions,
): state is ModComponentStateV0 {
  if (!("extensions" in state)) {
    return false;
  }

  return state.extensions != null && !Array.isArray(state.extensions);
}

export function isModComponentStateV1(
  state: ModComponentStateVersions,
): state is ModComponentStateV1 {
  if (!("extensions" in state)) {
    return false;
  }

  return (
    Array.isArray(state.extensions) &&
    state.extensions[0] != null &&
    !("createTimestamp" in state.extensions[0])
  );
}

export function isModComponentStateV2(
  state: ModComponentStateVersions,
): state is ModComponentStateV2 {
  if (!("extensions" in state)) {
    return false;
  }

  return (
    Array.isArray(state.extensions) &&
    state.extensions[0] != null &&
    // See: ActivatedModComponentV1
    "createTimestamp" in state.extensions[0] &&
    "services" in state.extensions[0]
  );
}

export function isModComponentStateV3(
  state: ModComponentStateVersions,
): state is ModComponentStateV3 {
  if (!("extensions" in state)) {
    return false;
  }

  return (
    Array.isArray(state.extensions) &&
    (state.extensions[0] == null ||
      // See: ActivatedModComponentV2 -- Also, if the services/integrationDependencies
      // field is missing completely, the app logic will properly handle it as a V3 type.
      !("services" in state.extensions[0]))
  );
}

export function isModComponentStateV4(
  state: ModComponentStateVersions,
): state is ModComponentStateV4 {
  if (!("extensions" in state)) {
    return false;
  }

  return (
    isModComponentStateV3(state) &&
    // All standalone components have been migrated or removed
    !state.extensions.some((extension) => extension._recipe == null)
  );
}

export function isModComponentStateV5(
  state: ModComponentStateVersions,
): state is ModComponentStateV5 {
  if (!("activatedModComponents" in state)) {
    return false;
  }

  return Array.isArray(state.activatedModComponents);
}
