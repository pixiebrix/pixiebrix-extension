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

import { type EditablePackageMetadata } from "../../../types/contract";

/**
 * Valid values for the Workshop table/filters.
 *
 * Excludes and entry for readers because they're deprecated.
 *
 * @since 1.7.34
 */
export type KindFilterValue = "Brick" | "Mod" | "Integration" | "Starter";

/**
 * Returns the kind for the Workshop table/filter.
 * @since 1.7.20
 */
export function mapKindToKindUiValue(
  kind: EditablePackageMetadata["kind"],
): KindFilterValue {
  switch (kind.toLowerCase()) {
    case "brick":
    case "reader": {
      return "Brick";
    }

    case "blueprint": {
      return "Mod";
    }

    case "service": {
      return "Integration";
    }

    case "foundation": {
      return "Starter";
    }

    default: {
      return "Brick";
    }
  }
}
