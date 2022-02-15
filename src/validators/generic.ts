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

import extensionPointRegistry from "@/extensionPoints/registry";
import { useMemo } from "react";
import { AsyncState, useAsyncState } from "@/hooks/common";
import { services } from "@/background/messenger/api";
import {
  Validator,
  Schema as ValidatorSchema,
  ValidationResult,
} from "@cfworker/json-schema";
import { IExtension, SchemaProperties, Schema } from "@/core";
import serviceRegistry from "@/services/registry";
import { inputProperties } from "@/helpers";
import { pickBy, isEmpty } from "lodash";
import urljoin from "url-join";
import $RefParser, {
  FileInfo,
  ResolverOptions,
} from "@apidevtools/json-schema-ref-parser";

import draft07 from "@schemas/draft-07.json";
import serviceSchema from "@schemas/service.json";
import readerSchema from "@schemas/reader.json";
import extensionPointSchema from "@schemas/extensionPoint.json";
import iconSchema from "@schemas/icon.json";
import recipeSchema from "@schemas/recipe.json";
import keySchema from "@schemas/key.json";
import metadataSchema from "@schemas/metadata.json";
import refSchema from "@schemas/ref.json";
import componentSchema from "@schemas/component.json";
import {
  MissingConfigurationError,
  NotConfiguredError,
} from "@/services/errors";
import { extensionValidatorFactory } from "./validation";
import { resolveDefinitions } from "@/registry/internal";

const SCHEMA_URLS: Record<string, Record<string, unknown>> = {
  "http://json-schema.org/draft-07/schema": draft07,
  "https://app.pixiebrix.com/schemas/metadata": metadataSchema,
  "https://app.pixiebrix.com/schemas/key": keySchema,
  "https://app.pixiebrix.com/schemas/service": serviceSchema,
  "https://app.pixiebrix.com/schemas/extensionPoint": extensionPointSchema,
  "https://app.pixiebrix.com/schemas/icon": iconSchema,
  "https://app.pixiebrix.com/schemas/recipe": recipeSchema,
  "https://app.pixiebrix.com/schemas/reader": readerSchema,
  "https://app.pixiebrix.com/schemas/component": componentSchema,
  "https://app.pixiebrix.com/schemas/ref": refSchema,
};

const BASE_SCHEMA_URI = "https://app.pixiebrix.com/schemas/";

const REF_SECRETS = [
  "https://app.pixiebrix.com/schemas/key",
  "https://app.pixiebrix.com/schemas/key#",
];

export const KIND_SCHEMAS = {
  service: serviceSchema,
  reader: readerSchema,
  extensionPoint: extensionPointSchema,
  recipe: recipeSchema,
  component: componentSchema,
};

export async function validateKind(
  instance: Record<string, unknown>,
  kind: keyof typeof KIND_SCHEMAS
): Promise<ValidationResult> {
  const finalSchema = await dereference(KIND_SCHEMAS[kind] as Schema);
  const validator = new Validator(finalSchema as any);

  validator.addSchema(draft07 as ValidatorSchema);

  return validator.validate(instance);
}

/**
 * Validate the output of a block against its output JSONSchema
 */
export async function validateOutput(
  schema: Schema,
  instance: unknown
): Promise<ValidationResult> {
  const validator = new Validator({
    $id: urljoin(BASE_SCHEMA_URI, "block"),
    ...schema,
  } as ValidatorSchema);

  // @ts-expect-error: loading statically
  validator.addSchema(serviceSchema);

  return validator.validate(instance ?? null);
}

/**
 * Validate the input of a block against its output JSONSchema.
 *
 * To avoid secret leakage, does not validate the secret `$ref`s of properties taking service configuration.
 */
export async function validateInput(
  schema: Schema,
  instance: unknown
): Promise<ValidationResult> {
  const validator = new Validator({
    $id: urljoin(BASE_SCHEMA_URI, "block"),
    ...schema,
  } as ValidatorSchema);

  // @ts-expect-error: loading statically
  validator.addSchema(serviceSchema);

  for (const service of await serviceRegistry.all()) {
    validator.addSchema({
      $id: `${BASE_SCHEMA_URI}services/${service.id}`,
      type: "object",
      // Strip out the properties containing secrets because those will be excluded as this point
      // @ts-expect-error: getting confused about schema types
      properties: pickBy(
        inputProperties(service.schema),
        // @ts-expect-error: getting confused about schema types
        (x) => !REF_SECRETS.includes(x.$ref)
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
    properties,
    required:
      required === undefined && !isEmpty(properties)
        ? Object.keys(properties)
        : required,
  };
}

export interface ExtensionValidationResult {
  valid: boolean;
  notConfigured: NotConfiguredError[];
  missingConfiguration: MissingConfigurationError[];
  schemaErrors: any;
}

async function validateExtension(
  extension: IExtension
): Promise<ExtensionValidationResult> {
  console.debug(`Validating ${extension.id}`);

  const resolved = await resolveDefinitions(extension);

  const extensionPoint = await extensionPointRegistry.lookup(
    resolved.extensionPointId
  );

  const extensionValidator = extensionValidatorFactory(
    extensionPoint.inputSchema
  );

  let schemaErrors: any;
  let validated = true;
  try {
    await extensionValidator.validate(extension);
  } catch (error) {
    validated = false;
    schemaErrors = error;
  }

  const notConfigured = [];
  const missingConfiguration = [];

  if (extension.services?.length) {
    for (const service of extension.services) {
      console.debug(`Validating ${extension.id} service ${service.id}`);
      try {
        await services.locate(service.id, service.config);
      } catch (error) {
        if (error instanceof MissingConfigurationError) {
          missingConfiguration.push(error);
        } else if (error instanceof NotConfiguredError) {
          notConfigured.push(error);
        } else {
          console.debug(error);
        }
      }
    }
  }

  return {
    valid:
      notConfigured.length === 0 &&
      missingConfiguration.length === 0 &&
      validated,
    notConfigured,
    missingConfiguration,
    schemaErrors,
  };
}

export function useExtensionValidator(
  extension: IExtension
): AsyncState<ExtensionValidationResult> {
  const validationPromise = useMemo(
    async () => validateExtension(extension),
    [extension]
  );
  return useAsyncState(validationPromise);
}

// Const PIXIEBRIX_SCHEMA = /^https:\/\/app.pixiebrix\.com\/schemas\//i;

const pixieResolver: ResolverOptions = {
  order: 1,
  canRead: /^https?:\/\//i,
  async read(file: FileInfo) {
    if (SCHEMA_URLS[file.url]) {
      return SCHEMA_URLS[file.url] as any;
    }

    throw new Error(`Unknown file ${file.url}`);
  },
};

export async function bundle(schema: Schema): Promise<Schema> {
  return $RefParser.bundle(schema as any, {
    resolve: { pixieResolver },
  }) as Promise<Schema>;
}

export async function dereference(schema: Schema): Promise<Schema> {
  return $RefParser.dereference(schema as any, {
    resolve: { pixieResolver },
    dereference: {
      circular: "ignore",
    },
  }) as Promise<Schema>;
}
