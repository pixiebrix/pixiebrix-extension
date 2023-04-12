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

import { type Primitive } from "type-fest";
import { type ErrorObject } from "serialize-error";

export type ActionType = string;

/**
 * A serialized error type
 * @see SimpleErrorObject
 *  todo: We can possibly unify these two types
 */
export type SerializedError = Primitive | ErrorObject;

/**
 * The Meta section of a message (for message passing between extension components)
 *
 * Not to be mistaken with Metadata in brick definitions
 *
 * @see Message
 */
export interface Meta {
  nonce?: string;
  [index: string]: unknown;
}

/**
 * A message target frame on a tab.
 */
export type Target = {
  tabId: number;
  frameId: number;
};

/**
 * Standard message format for cross-context messaging.
 *
 * Inspired by: https://github.com/redux-utilities/flux-standard-action
 */
export interface Message<
  Type extends ActionType = ActionType,
  TMeta extends Meta = Meta
> {
  type: Type;
  payload?: unknown;
  meta?: TMeta;
}
