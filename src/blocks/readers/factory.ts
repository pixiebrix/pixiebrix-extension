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

const _readerFactories: {
  [key: string]: (config: any) => Promise<ReaderOutput>;
} = {};

export function registerFactory(
  key: string,
  read: (config: any) => Promise<ReaderOutput>
) {
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

    async read() {
      const doRead = _readerFactories[reader.type];
      if (doRead) {
        return doRead(definition.reader as any);
      } else {
        throw new Error(`Reader type ${reader.type} not implemented`);
      }
    }
  }

  return new ExternalReader();
}
