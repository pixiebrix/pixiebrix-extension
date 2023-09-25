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

import {
  type ActivatedModComponent,
  type UnresolvedModComponent,
} from "@/types/modComponentTypes";

/**
 * @deprecated - Do not use versioned state types directly
 */
export type ModComponentStateV0 = {
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- Record doesn't allow labelled keys
  extensions: {
    // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- Record doesn't allow labelled keys
    [extensionPointId: string]: {
      [extensionId: string]: UnresolvedModComponent;
    };
  };
};

/**
 * @deprecated - Do not use versioned state types directly
 */
export type ModComponentStateV1 = {
  extensions: UnresolvedModComponent[];
};

/**
 * @deprecated - Do not use versioned state types directly
 */
export type ModComponentStateV2 = {
  extensions: ActivatedModComponent[];
};

export type ModComponentState = ModComponentStateV2;

export type ModComponentsRootState = {
  options: ModComponentState;
};
