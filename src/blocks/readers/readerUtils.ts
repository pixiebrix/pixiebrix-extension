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

import { ReaderConfig } from "@/blocks/types";
import { RegistryId } from "@/core";

export function selectReaderIds(config: ReaderConfig): RegistryId[] {
  if (typeof config === "string") {
    return [config];
  }

  if (Array.isArray(config)) {
    return config.flatMap((x) => selectReaderIds(x));
  }

  if (typeof config === "object") {
    return Object.values(config).flatMap((x) => selectReaderIds(x));
  }

  return [];
}
