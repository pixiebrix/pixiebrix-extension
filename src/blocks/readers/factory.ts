/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Reader } from "@/types";
import { checkAvailable } from "@/blocks/available";
import { ValidationError } from "@/errors";
import { Metadata, IReader, Schema, ReaderOutput } from "@/core";
import { Availability } from "@/blocks/types";
import { Validator } from "@cfworker/json-schema";
import { dereference } from "@/validators/generic";
import readerSchema from "@schemas/reader.json";
import { Schema as ValidatorSchema } from "@cfworker/json-schema/dist/types";

interface ReaderDefinition {
  isAvailable: Availability;
  reader: {
    type: string;
    [key: string]: unknown;
  };
}

interface ReaderConfig<TDefinition extends ReaderDefinition> {
  metadata: Metadata;
  outputSchema: Schema;
  kind: "reader";
  definition: TDefinition;
}

function validateReaderDefinition(
  component: unknown
): asserts component is ReaderConfig<ReaderDefinition> {
  const validator = new Validator(
    dereference(readerSchema as Schema) as ValidatorSchema
  );
  const result = validator.validate(component);
  if (!result.valid) {
    console.warn(`Invalid reader configuration`, result);
    throw new ValidationError("Invalid reader configuration", result.errors);
  }
}

type Read = (
  config: any,
  root: HTMLElement | Document
) => Promise<ReaderOutput>;

const _readerFactories: {
  [type: string]: Read;
} = {};

export function registerFactory(key: string, read: Read): void {
  _readerFactories[key] = read;
}

export function readerFactory(component: unknown): IReader {
  validateReaderDefinition(component);

  const {
    metadata: { id, name, description },
    outputSchema = {},
    definition,
    kind,
  } = component;

  const { reader, isAvailable } = definition;

  if (kind !== "reader") {
    throw new Error(`Expected kind reader, got ${kind}`);
  }

  class ExternalReader extends Reader {
    constructor() {
      super(id, name, description);
    }

    outputSchema: Schema = outputSchema;

    async isAvailable() {
      return await checkAvailable(isAvailable);
    }

    async read(root: HTMLElement | Document): Promise<ReaderOutput> {
      const doRead = _readerFactories[reader.type];
      if (doRead) {
        return doRead(definition.reader as any, root);
      } else {
        throw new Error(`Reader type ${reader.type} not implemented`);
      }
    }
  }

  return new ExternalReader();
}
