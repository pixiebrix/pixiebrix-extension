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

import { ReaderConfig } from "@/blocks/types";
import { IReader, RegistryId } from "@/core";
import blockRegistry from "@/blocks/registry";
import ArrayCompositeReader from "@/blocks/readers/ArrayCompositeReader";
import { isPlainObject, mapValues } from "lodash";
import CompositeReader from "@/blocks/readers/CompositeReader";
import { resolveObj } from "@/utils";
import { BusinessError } from "@/errors/businessErrors";

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

/** Instantiate a reader from a reader configuration. */
export async function mergeReaders(
  readerConfig: ReaderConfig
): Promise<IReader> {
  if (typeof readerConfig === "string") {
    return blockRegistry.lookup(readerConfig) as Promise<IReader>;
  }

  if (Array.isArray(readerConfig)) {
    return new ArrayCompositeReader(
      await Promise.all(readerConfig.map(async (x) => mergeReaders(x)))
    );
  }

  if (isPlainObject(readerConfig)) {
    return new CompositeReader(
      await resolveObj(mapValues(readerConfig, mergeReaders))
    );
  }

  throw new BusinessError("Unexpected value for readerConfig");
}
