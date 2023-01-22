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

import {
  type Schema as ValidatorSchema,
  type ValidationResult,
  Validator,
} from "@cfworker/json-schema";
import { type Schema, type SchemaProperties } from "@/core";
import serviceRegistry from "@/services/registry";
import { inputProperties } from "@/helpers";
import { isEmpty, pickBy } from "lodash";
import urljoin from "url-join";
import $RefParser, {
  type FileInfo,
  type ResolverOptions,
} from "@apidevtools/json-schema-ref-parser";

import draft07 from "@schemas/draft-07.json";
import serviceSchema from "@schemas/service.json";
import readerSchema from "@schemas/reader.json";
import extensionPointSchema from "@schemas/extensionPoint.json";
import iconSchema from "@schemas/icon.json";
import recipeSchema from "@schemas/recipe.json";
import keySchema from "@schemas/key.json";
import metadataSchema from "@schemas/metadata.json";
import innerDefinitionSchema from "@schemas/innerDefinition.json";
import refSchema from "@schemas/ref.json";
import componentSchema from "@schemas/component.json";
import pipelineSchema from "@schemas/pipeline.json";
import databaseSchema from "@schemas/database.json";
import elementSchema from "@schemas/element.json";
import { type UnknownObject } from "@/types";

const SCHEMA_URLS: Record<string, UnknownObject> = {
  "http://json-schema.org/draft-07/schema": draft07,
  "https://app.pixiebrix.com/schemas/metadata": metadataSchema,
  "https://app.pixiebrix.com/schemas/key": keySchema,
  "https://app.pixiebrix.com/schemas/service": serviceSchema,
  "https://app.pixiebrix.com/schemas/extensionPoint": extensionPointSchema,
  "https://app.pixiebrix.com/schemas/icon": iconSchema,
  "https://app.pixiebrix.com/schemas/recipe": recipeSchema,
  "https://app.pixiebrix.com/schemas/reader": readerSchema,
  "https://app.pixiebrix.com/schemas/pipeline": pipelineSchema,
  "https://app.pixiebrix.com/schemas/component": componentSchema,
  "https://app.pixiebrix.com/schemas/ref": refSchema,
  "https://app.pixiebrix.com/schemas/innerDefinition": innerDefinitionSchema,
  "https://app.pixiebrix.com/schemas/database": databaseSchema,
  "https://app.pixiebrix.com/schemas/element": elementSchema,
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
  // @ts-expect-error: loading statically
  validator.addSchema(elementSchema);

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

  for (const inputArgSchema of [
    serviceSchema,
    pipelineSchema,
    refSchema,
    databaseSchema,
  ]) {
    // @ts-expect-error: loading statically
    validator.addSchema(inputArgSchema);
  }

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
    // Disable built-in resolvers
    // https://apitools.dev/json-schema-ref-parser/docs/options.html
    resolve: { pixieResolver, http: false, file: false },
  }) as Promise<Schema>;
}

export async function dereference(schema: Schema): Promise<Schema> {
  return $RefParser.dereference(schema as any, {
    // Disable built-in resolvers
    // https://apitools.dev/json-schema-ref-parser/docs/options.html
    resolve: { pixieResolver, http: false, file: false },
    dereference: {
      circular: "ignore",
    },
  }) as Promise<Schema>;
}
