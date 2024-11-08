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
  isStarterBrickDefinitionProp,
  isStarterBrickDefinitionLike,
  type StarterBrickDefinitionProp,
  type StarterBrickDefinitionLike,
} from "./types";
import deepEquals from "fast-deep-equal";
import { normalizeAvailability } from "../bricks/available";
import { omit } from "lodash";

/**
 * Normalize the common structure of a starter brick definition. Does not change the functionality of the starter brick.
 *
 * Some Page Editor adapters may perform additional normalization steps as field/configuration affordances are added
 * to the starter brick.
 */
export function normalizeStarterBrickDefinitionProp(
  definition: StarterBrickDefinitionProp,
): StarterBrickDefinitionProp {
  return {
    ...definition,
    isAvailable: normalizeAvailability(definition.isAvailable),
  };
}

/**
 * Return true if the two starter brick definitions are equal modulo normalization.
 */
function isStarterBrickDefinitionPropEqual(
  lhs: unknown,
  rhs: unknown,
): boolean {
  if (isStarterBrickDefinitionProp(lhs) && isStarterBrickDefinitionProp(rhs)) {
    return deepEquals(
      normalizeStarterBrickDefinitionProp(lhs),
      normalizeStarterBrickDefinitionProp(rhs),
    );
  }

  // If the objects don't adhere to interface, fallback to equality
  return deepEquals(lhs, rhs);
}

/**
 * Return true if the two starter brick definitions are equal modulo normalization.
 */
function isStarterBrickDefinitionLikeEqual(
  lhs: StarterBrickDefinitionLike,
  rhs: StarterBrickDefinitionLike,
): boolean {
  return (
    deepEquals(omit(lhs, ["definition"]), omit(rhs, ["definition"])) &&
    isStarterBrickDefinitionPropEqual(lhs.definition, rhs.definition)
  );
}

/**
 * Return true if the two starter brick definitions are equal modulo normalization.
 */
// XXX: move this method once we support inner definitions for other types
export function isInnerDefinitionEqual(
  lhs: UnknownObject,
  rhs: UnknownObject,
): boolean {
  // Starter Bricks are currently the only definitions produced by the Page Editor
  if (isStarterBrickDefinitionLike(lhs) && isStarterBrickDefinitionLike(rhs)) {
    return isStarterBrickDefinitionLikeEqual(lhs, rhs);
  }

  return deepEquals(lhs, rhs);
}
