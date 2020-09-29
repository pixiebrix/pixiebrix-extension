import extensionPointRegistry from "@/extensionPoints/registry";
import { useMemo } from "react";
import { useAsyncState } from "@/hooks/common";
import {
  Validator,
  Schema as ValidatorSchema,
  ValidationResult,
} from "@cfworker/json-schema";
import { IExtension, SchemaProperties, Schema, ServiceLocator } from "@/core";
import serviceRegistry from "@/services/registry";
import { inputProperties } from "@/helpers";
import pickBy from "lodash/pickBy";
import urljoin from "url-join";
import $RefParser, {
  FileInfo,
  ResolverOptions,
} from "@apidevtools/json-schema-ref-parser";

import draft07 from "@schemas/draft-07.json";
import serviceSchema from "@schemas/service.json";
import keySchema from "@schemas/key.json";
import metadataSchema from "@schemas/metadata.json";
import {
  MissingConfigurationError,
  MultipleConfigurationError,
} from "@/services/errors";
import { extensionValidatorFactory } from "@/designer/options/pages/ExtensionEditor/validation";

const SCHEMA_URLS = {
  "http://json-schema.org/draft-07/schema": draft07,
  "https://app.pixiebrix.com/schemas/metadata": metadataSchema,
  "https://app.pixiebrix.com/schemas/key": keySchema,
  "https://app.pixiebrix.com/schemas/service": serviceSchema,
};

const BASE_SCHEMA_URI = "https://app.pixiebrix.com/schemas/";

const REF_SECRETS = [
  "https://www.pixiebrix.com/schemas/key#",
  "https://app.pixiebrix.com/schemas/key#",
];

export function validateInput(
  schema: Schema,
  instance: unknown
): ValidationResult {
  const validator = new Validator({
    $id: urljoin(BASE_SCHEMA_URI, "block"),
    ...schema,
  } as ValidatorSchema);

  // @ts-ignore: loading statically
  validator.addSchema(serviceSchema);

  for (const service of serviceRegistry.all()) {
    validator.addSchema({
      $id: `${BASE_SCHEMA_URI}services/${service.id}`,
      type: "object",
      // Strip out the properties containing secrets because those will be excluded as this point
      // @ts-ignore: getting confused about schema types
      properties: pickBy(
        inputProperties(service.schema),
        // @ts-ignore: getting confused about schema types
        (x) => !REF_SECRETS.includes(x["$ref"])
      ),
    });
  }

  return validator.validate(instance ?? null);
}

/**
 * Convert JSON Schema properties value to a top-level JSONSchema.
 */
export function propertiesToSchema(
  properties: SchemaProperties,
  required?: string[]
): Schema {
  return {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: properties,
    required:
      required === undefined ? Array.from(Object.keys(properties)) : required,
  };
}

export interface ExtensionValidationResult {
  valid: boolean;
  notConfigured: MissingConfigurationError[];
  missingConfiguration: MissingConfigurationError[];
  multipleAuths: MultipleConfigurationError[];
}

async function validateExtension(
  locator: ServiceLocator,
  extension: IExtension
): Promise<ExtensionValidationResult> {
  console.debug(`Validating ${extension.id}`);

  const extensionPoint = extensionPointRegistry.lookup(
    extension.extensionPointId
  );

  const extensionValidator = extensionValidatorFactory(
    locator,
    extensionPoint.inputSchema
  );

  const isValid = await extensionValidator.isValid(extension);

  const notConfigured = [];
  const multipleAuths = [];
  const missingConfiguration = [];

  if (extension.services?.length) {
    for (const service of extension.services) {
      console.debug(`Validating ${extension.id} service ${service.id}`);
      try {
        await locator(service.id, service.config);
      } catch (ex) {
        if (ex instanceof MissingConfigurationError) {
          if (ex.id) {
            missingConfiguration.push(ex);
          } else {
            notConfigured.push(ex);
          }
        } else if (ex instanceof MultipleConfigurationError) {
          multipleAuths.push(ex);
        } else {
          console.debug(ex);
        }
      }
    }
  }

  return {
    valid:
      !notConfigured.length &&
      !multipleAuths.length &&
      !missingConfiguration.length &&
      isValid,
    notConfigured,
    multipleAuths,
    missingConfiguration,
  };
}

export function useExtensionValidator(
  locator: ServiceLocator,
  extension: IExtension
): [ExtensionValidationResult | undefined, boolean] {
  const validationPromise = useMemo(
    () => validateExtension(locator, extension),
    [extension, locator]
  );
  return useAsyncState(validationPromise);
}

// const PIXIEBRIX_SCHEMA = /^https:\/\/app.pixiebrix\.com\/schemas\//i;

const pixieResolver: ResolverOptions = {
  order: 1,
  canRead: /^https?:\/\//i,
  async read(file: FileInfo) {
    if (SCHEMA_URLS.hasOwnProperty(file.url)) {
      // @ts-ignore
      return SCHEMA_URLS[file.url];
    }
    throw new Error(`Unknown file ${file.url}`);
  },
};

export async function dereference(schema: Schema): Promise<Schema> {
  return (await $RefParser.dereference(schema as any, {
    resolve: { pixieResolver },
  })) as Schema;
}
