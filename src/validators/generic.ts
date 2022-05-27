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
  Schema as ValidatorSchema,
  ValidationResult,
  Validator,
} from "@cfworker/json-schema";
import { IExtension, Schema, SchemaProperties } from "@/core";
import serviceRegistry from "@/services/registry";
import { inputProperties } from "@/helpers";
import { isEmpty, isPlainObject, mapValues, pickBy, uniq } from "lodash";
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
import pipelineSchema from "@schemas/pipeline.json";
import {
  MissingConfigurationError,
  NotConfiguredError,
} from "@/services/errors";
import { resolveDefinitions } from "@/registry/internal";
import Lazy from "yup/lib/Lazy";
import * as Yup from "yup";
import blockRegistry from "@/blocks/registry";
import { isUUID, validateRegistryId } from "@/types/helpers";
import { DoesNotExistError } from "@/baseRegistry";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import { UnknownObject } from "@/types";

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

  for (const inputArgSchema of [serviceSchema, pipelineSchema, refSchema]) {
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

export interface ExtensionValidationResult {
  valid: boolean;
  notConfigured: NotConfiguredError[];
  missingConfiguration: MissingConfigurationError[];
  schemaErrors: any;
}

const IDENTIFIER_REGEX = /^[A-Z_a-z]\w*$/;
const BRICK_RUN_METHODS: Record<string, string> = {
  "#/definitions/renderer": "render",
  "#/definitions/effect": "effect",
  "#/definitions/reader": "read",
  "#/definitions/transformer": "transform",
  "https://app.pixiebrix.com/schemas/renderer": "render",
  "https://app.pixiebrix.com/schemas/effect": "effect",
  "https://app.pixiebrix.com/schemas/reader": "read",
  "https://app.pixiebrix.com/schemas/transformer": "transform",
  "https://app.pixiebrix.com/schemas/renderer#": "render",
  "https://app.pixiebrix.com/schemas/effect#": "effect",
  "https://app.pixiebrix.com/schemas/reader#": "read",
  "https://app.pixiebrix.com/schemas/transformer#": "transform",
};
type Options = {
  required: boolean;
};

function blockSchemaFactory(): Yup.AnyObjectSchema {
  return Yup.object().shape({
    id: Yup.string().test("is-block", "Block not found", async (id: string) =>
      blockRegistry.exists(validateRegistryId(id))
    ),
    templateEngine: Yup.string()
      .oneOf(["nunjucks", "mustache", "handlebars"])
      .notRequired(),
    outputKey: Yup.string().matches(IDENTIFIER_REGEX).notRequired(),
    // FIXME: check the config shape asynchronously
    // config: configSchemaFactory(block.inputSchema)
    config: Yup.object(),
  });
}

function isBrickSchema(schema: Schema): boolean {
  // FIXME: right now the extension point schema for blocks has the structure. Need to rationalize how to encode
  //   properties taking a simple or composite block.
  // oneOf: [
  //   { $ref: "https://app.pixiebrix.com/schemas/effect#" },
  //   {
  //     type: "array",
  //     items: { $ref: "https://app.pixiebrix.com/schemas/block#" },
  //   },
  // ],
  return (
    Boolean(BRICK_RUN_METHODS[schema.$ref]) ||
    (schema.oneOf ?? []).some(
      (x) => typeof x === "object" && BRICK_RUN_METHODS[x.$ref]
    )
  );
}

export function configSchemaFactory(
  schema: Schema,
  { required = false }: Options = {} as Options
): Lazy<Yup.BaseSchema> | Yup.BaseSchema {
  const wrapRequired = (x: any) => (required ? x.required() : x);

  if (isBrickSchema(schema)) {
    return Yup.lazy((value) => {
      if (isPlainObject(value)) {
        return blockSchemaFactory();
      }

      return Yup.array().of(blockSchemaFactory()).min(1);
    });
  }

  switch (schema.type) {
    case "object": {
      return Yup.lazy((value) => {
        if (isPlainObject(value)) {
          return Yup.object().shape(
            mapValues(schema.properties, (definition, prop) => {
              if (typeof definition === "boolean") {
                return wrapRequired(Yup.string());
              }

              return configSchemaFactory(definition, {
                required: (schema.required ?? []).includes(prop),
              });
            })
          );
        }

        return Yup.string();
      });
    }

    case "array": {
      if (typeof schema.items === "boolean") {
        throw new TypeError(
          "Expected schema definition for items, not boolean"
        );
      }

      if (Array.isArray(schema.items)) {
        // TODO: implement support for tuples
        // https://github.com/jquense/yup/issues/528
        return Yup.lazy((x) =>
          Array.isArray(x)
            ? wrapRequired(Yup.array())
            : wrapRequired(Yup.string())
        );
      }

      const { items } = schema;
      return Yup.lazy((x) =>
        Array.isArray(x)
          ? // TODO: Drop `any` after https://github.com/jquense/yup/issues/1190
            wrapRequired(Yup.array().of(configSchemaFactory(items) as any))
          : wrapRequired(Yup.string())
      );
    }

    case "boolean": {
      return Yup.bool();
    }

    default: {
      return wrapRequired(Yup.string());
    }
  }
}

function serviceSchemaFactory(): Yup.ArraySchema<Yup.AnySchema> {
  return Yup.array()
    .of(
      Yup.object().shape({
        id: Yup.string().test(
          "is-service",
          "Unknown service",
          async (value) => {
            try {
              await serviceRegistry.lookup(validateRegistryId(value));
            } catch (error) {
              if (error instanceof DoesNotExistError) {
                return false;
              }
            }

            return true;
          }
        ),
        outputKey: Yup.string()
          .required()
          .matches(IDENTIFIER_REGEX, "Not a valid identifier"),
        // https://github.com/jquense/yup/issues/954
        config: Yup.string()
          .nullable()
          .test(
            "is-config",
            "Invalid service configuration",
            async function (value) {
              if (this.parent.id === PIXIEBRIX_SERVICE_ID) {
                if (value != null) {
                  return this.createError({
                    message: "PixieBrix service configuration should be blank",
                  });
                }

                return true;
              }

              if (value == null) {
                return this.createError({
                  message: "Select a service configuration",
                });
              }

              if (!isUUID(value)) {
                return this.createError({
                  message: "Expected service configuration UUID",
                });
              }

              try {
                await services.locate(this.parent.id, value);
              } catch (error) {
                if (error instanceof MissingConfigurationError) {
                  return this.createError({
                    message: "Configuration no longer available",
                  });
                }

                console.error(
                  `An error occurred validating service: ${this.parent.id}`
                );
              }

              return true;
            }
          ),
      })
    )
    .test(
      "unique-keys",
      "Services must have unique keys",
      (value) => value.length === uniq(value.map((x) => x.outputKey)).length
    );
}

export function extensionValidatorFactory(schema: Schema): Yup.AnyObjectSchema {
  return Yup.object().shape({
    label: Yup.string(),
    services: serviceSchemaFactory(),
    config: configSchemaFactory(schema),
  });
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

  for (const service of extension.services ?? []) {
    console.debug(`Validating ${extension.id} service ${service.id}`);
    try {
      // eslint-disable-next-line no-await-in-loop -- TODO: Make it run in parallel if possible
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
