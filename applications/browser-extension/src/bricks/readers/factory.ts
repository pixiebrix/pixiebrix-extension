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

import { checkAvailable } from "@/bricks/available";
import type { BrickConfig } from "@/bricks/types";
import { cloneDeep } from "lodash";
import { InvalidDefinitionError } from "@/errors/businessErrors";
import { type ApiVersion, type SelectorRoot } from "../../types/runtimeTypes";
import { type Schema } from "../../types/schemaTypes";
import { type JsonObject } from "type-fest";
import { type Reader, ReaderABC } from "../../types/bricks/readerTypes";
import {
  type DefinitionKinds,
  type Metadata,
  type SemVerString,
} from "../../types/registryTypes";
import {
  PAGE_SCRIPT_CAPABILITIES,
  type PlatformCapability,
} from "../../platform/capabilities";
import { validatePackageDefinition } from "../../validators/schemaValidator";
import { type Availability } from "../../types/availabilityTypes";

export interface ReaderTypeConfig {
  type: string;
  [key: string]: unknown;
}

export interface ReaderDefinition {
  isAvailable?: Availability;
  reader: ReaderTypeConfig;
}

export interface ReaderConfig<
  TDefinition extends ReaderDefinition = ReaderDefinition,
> {
  apiVersion?: ApiVersion;
  metadata: Metadata;
  outputSchema: Schema;
  kind: typeof DefinitionKinds.READER;
  definition: TDefinition;
}

function validateReaderDefinition(
  component: unknown,
): asserts component is ReaderConfig {
  const result = validatePackageDefinition("reader", component);
  if (!result.valid) {
    console.warn("Invalid reader configuration", result);
    throw new InvalidDefinitionError(
      "Invalid reader configuration",
      result.errors,
    );
  }
}

export type Read<TConfig = unknown> = (
  config: TConfig,
  root: SelectorRoot,
) => Promise<JsonObject>;

const _readerFactories = new Map<string, Read>();

export function registerFactory(readerType: string, read: Read): void {
  _readerFactories.set(readerType, read);
}

export function readerFactory(component: unknown): Reader {
  validateReaderDefinition(component);

  // Need to `cloneDeep` because component could be a proxy object
  const cloned = cloneDeep(component);

  const {
    metadata: { id, name, description, version },
    outputSchema = {},
    definition,
  } = cloned;

  const { reader, isAvailable } = definition;

  if (reader == null) {
    throw new TypeError("definition.reader is null");
  }

  class ExternalReader extends ReaderABC {
    constructor() {
      super(id, name, description);
    }

    public readonly version: SemVerString | undefined = version;

    override outputSchema: Schema = outputSchema;

    async isAvailable(): Promise<boolean> {
      return Boolean(isAvailable && checkAvailable(isAvailable));
    }

    override async isPure(): Promise<boolean> {
      return true;
    }

    override async getRequiredCapabilities(
      _config: BrickConfig,
    ): Promise<PlatformCapability[]> {
      return PAGE_SCRIPT_CAPABILITIES;
    }

    async read(root: SelectorRoot): Promise<JsonObject> {
      const doRead = _readerFactories.get(reader.type);
      if (doRead) {
        return doRead(reader, root);
      }

      throw new Error(`Reader type ${reader.type} not implemented`);
    }
  }

  return new ExternalReader();
}
