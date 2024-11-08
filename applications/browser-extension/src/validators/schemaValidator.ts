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

import {
  type Schema as ValidatorSchema,
  type ValidationResult,
  Validator,
} from "@cfworker/json-schema";
import { type Schema } from "@/types/schemaTypes";
import integrationRegistry from "../integrations/registry";
import { cloneDeep, pickBy, trimEnd } from "lodash";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import {
  type FileInfo,
  type ResolverOptions,
} from "@apidevtools/json-schema-ref-parser/dist/lib/types";
import draft07 from "../../schemas/draft-07.json";
import serviceSchema from "../../schemas/service.json";
import readerSchema from "../../schemas/reader.json";
import extensionPointSchema from "../../schemas/extensionPoint.json";
import iconSchema from "../../schemas/icon.json";
import recipeSchema from "../../schemas/recipe.json";
import keySchema from "../../schemas/key.json";
import metadataSchema from "../../schemas/metadata.json";
import innerDefinitionSchema from "../../schemas/innerDefinition.json";
import refSchema from "../../schemas/ref.json";
import componentSchema from "../../schemas/component.json";
import pipelineSchema from "../../schemas/pipeline.json";
import databaseSchema from "../../schemas/database.json";
import elementSchema from "../../schemas/element.json";
import googleSheetIdSchema from "../../schemas/googleSheetId.json";
import { inputProperties, minimalSchemaFactory } from "../utils/schemaUtils";
import { validateRegistryId } from "@/types/helpers";
import type { JSONSchema7 } from "json-schema";

const BUILT_IN_SCHEMAS: Readonly<Record<string, ValidatorSchema>> =
  Object.freeze({
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
    "https://app.pixiebrix.com/schemas/googleSheetId": googleSheetIdSchema,
  } as unknown as Record<string, ValidatorSchema>);

const REF_SECRETS = ["https://app.pixiebrix.com/schemas/key"];

export const KIND_SCHEMAS: Readonly<Record<string, ValidatorSchema>> =
  Object.freeze({
    service: serviceSchema,
    reader: readerSchema,
    extensionPoint: extensionPointSchema,
    recipe: recipeSchema,
    component: componentSchema,
  } as unknown as Record<string, ValidatorSchema>);

/**
 * $ref resolver factory that fetches the integration definition from the integration definition registry.
 * @param sanitize true to exclude properties associated with secrets
 * @param mode properties to include only the properties of the schema, configuration to match an
 * IntegrationConfiguration
 * @see IntegrationConfig
 * @see SanitizedIntegrationConfig
 */
function integrationResolverFactory({
  sanitize,
  mode,
}: {
  sanitize: boolean;
  mode: "properties" | "configuration";
}): ResolverOptions {
  return {
    order: 1,
    canRead: /^https:\/\/app\.pixiebrix\.com\/schemas\/services\/\S+/i,
    async read(file: FileInfo) {
      // https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API#making_matching_groups_repeated
      const pattern = new URLPattern({ pathname: "/schemas/services/:id+" });
      const result = pattern.exec(file.url);

      if (!result) {
        throw new Error(`Invalid integration URL ${file.url}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- linter and compiler disagree
      const integrationId = result.pathname.groups.id!;

      try {
        const integrationDefinition = await integrationRegistry.lookup(
          validateRegistryId(integrationId),
        );

        let propertiesSchema = integrationDefinition.schema;

        if (sanitize) {
          const sanitizedProperties = pickBy(
            inputProperties(integrationDefinition.schema),
            // `includes` type is annoyingly narrow: https://github.com/microsoft/TypeScript/issues/26255
            (x: JSONSchema7) =>
              x.$ref == null || !REF_SECRETS.includes(trimEnd(x.$ref, "#")),
          );

          propertiesSchema = {
            type: "object",
            // Strip out the properties containing secrets because those are excluded during runtime execution
            properties: sanitizedProperties,
            required: (integrationDefinition.schema.required ?? []).filter(
              (x) => x in sanitizedProperties,
            ),
          };
        }

        switch (mode) {
          // NOTE: including the $id cause duplicate schema errors when validating a dereferenced schema if the
          // reference is used in multiple places. But including an $id is useful for preserving field toggling
          // based on well-known schema $ids and it's safe to use in our code to convert JSON Schema to Yup schema.
          case "properties": {
            return {
              ...propertiesSchema,
              $id: file.url,
            };
          }

          case "configuration": {
            return {
              $id: file.url,
              type: "object",
              properties: {
                serviceId: {
                  type: "string",
                  const: integrationId,
                },
                config: propertiesSchema,
              },
              required: ["serviceId", "config"],
            };
          }

          default: {
            const modeNever: never = mode;
            throw new Error(`Unknown mode: ${modeNever}`);
          }
        }
      } catch (error) {
        console.warn("Error resolving integration definition schema", error);
        // Don't block on lookup failure
        return minimalSchemaFactory();
      }
    },
  };
}

/**
 * Schema resolver that resolves the schemas from BUILT_IN_SCHEMA_URLS.
 */
// eslint-disable-next-line local-rules/persistBackgroundData -- Static
const builtInSchemaResolver: ResolverOptions = {
  // XXX: order after integrationDefinitionResolver, which is more specific. Or considering combining?
  order: 2,
  canRead: /^https?:\/\//i,
  async read(file: FileInfo) {
    const url = trimEnd(file.url, "#");

    if (!Object.hasOwn(BUILT_IN_SCHEMAS, url)) {
      throw new Error(`Unknown schema: ${file.url}`);
    }

    // NOTE: keeping the $id causes duplicate schema errors when validating a dereferenced schema if the
    // reference is used in multiple places. But including an $id is useful for preserving field toggling
    // based on well-known schema $ids.
    // eslint-disable-next-line security/detect-object-injection -- hasOwn check
    return BUILT_IN_SCHEMAS[url];
  },
} as const;

/**
 * Returns a new copy of schema with all $refs de-referenced. Use in contexts that don't support $refs, e.g.,
 * creating a Yup schema from a JSON schema.
 *
 * @param schema the original schema that may contain $ref
 * @param sanitizeIntegrationDefinitions remove properties associated with secrets from integration definitions.
 * Should generally be set to true when using for runtime validation, but false when using for UI entry validation.
 * @see $RefParser.dereference
 */
export async function dereferenceForYup(
  schema: Schema,
  {
    sanitizeIntegrationDefinitions,
  }: {
    sanitizeIntegrationDefinitions: boolean;
  },
): Promise<Schema> {
  // $RefParser.dereference modifies the schema in place
  const clone = cloneDeep(schema);

  try {
    return await ($RefParser.dereference(clone, {
      resolve: {
        integrationDefinitionResolver: integrationResolverFactory({
          sanitize: sanitizeIntegrationDefinitions,
          // When dereferencing to generate a configuration UI, we only want the properties
          mode: "properties",
        }),
        builtInSchemaResolver,
        // Disable built-in resolvers: https://apitools.dev/json-schema-ref-parser/docs/options.html
        http: false,
        file: false,
      },
      dereference: {
        circular: "ignore",
      },
    }) as Promise<Schema>);
  } catch (rawError) {
    const errorMessage = `Failed to dereference schema: ${JSON.stringify(
      schema,
    )}`;
    throw new Error(errorMessage, {
      cause: rawError,
    });
  }
}

/**
 * Asynchronously validate an input/output value of a brick against a brick schema.
 *
 * Dereferences any `$ref`s in the schema.
 *
 * To avoid secret leakage, does not validate the secret `$ref`s of properties accepting an integration configuration.
 */
export async function validateBrickInputOutput(
  schema: Schema,
  instance: unknown,
): Promise<ValidationResult> {
  // We need to make sure that the schema is "unfrozen" and extensible before
  // passing into the Validator. It uses a slightly expanded type (ValidatorSchema)
  // from the base json-schema type, and some internal logic will set some
  // properties of the extended type.
  // We need to clone before passing into $RefParser.resolve(), because the
  // result of that (refs.values()) will also be passed into the Validator.
  // Don't cast yet though, because ValidatorSchema doesn't explicitly extend
  // JSONSchema7, so we'd have to cast it right back when passing into
  // $RefParser.resolve() below, which accepts (string | JSONSchema7) as the
  // first input argument.
  const validatorSchema = cloneDeep(schema);

  // Must pass a baseUrl because otherwise $RefParser.resolve will throw when running in an `about:srcdoc` iframe
  const baseUrl = "https://app.pixiebrix.com/schemas/base";

  // The @cfworker/json-schema Validator supports $ref, so we don't need to
  // dereference the schema, we can just resolve the integration and built-in refs.
  const refs = await $RefParser.resolve(baseUrl, validatorSchema, {
    resolve: {
      // Exclude secret properties, because they aren't passed to the runtime
      integrationDefinitionResolver: integrationResolverFactory({
        sanitize: true,
        // The runtime passes the whole configuration
        mode: "configuration",
      }),
      builtInSchemaResolver,
      // Disable built-in resolvers: https://apitools.dev/json-schema-ref-parser/docs/options.html
      http: false,
      file: false,
    },
  });

  const validator = new Validator({
    // Provide an $id to avoid an error about duplicate schema because validator defaults the schema $id.
    // The exact $id doesn't matter, it just can't be one of BUILT_IN_SCHEMAS.
    $id: "https://app.pixiebrix.com/schemas/value",
    // We can cast the object here because the extra properties on the expanded
    // ValidatorSchema type are all optional, and we've already previously
    // "unfrozen" the schema object, so the optional properties can be set on
    // the object at run time successfully.
    ...(validatorSchema as ValidatorSchema),
  });
  validator.addSchema(refs.values() as ValidatorSchema);
  return validator.validate(instance ?? null);
}

/**
 * Asynchronously validate an integration configuration against its schema.
 *
 * Dereferences any `$ref`s in the schema.
 */
export async function validateIntegrationConfiguration(
  schema: Schema,
  instance: unknown,
): Promise<ValidationResult> {
  // See validateBrickInputOutput for comments on the schema unfreezing and casting.
  const validatorSchema = cloneDeep(schema);

  const refs = await $RefParser.resolve(validatorSchema, {
    resolve: {
      builtInSchemaResolver,
      // Disable built-in resolvers: https://apitools.dev/json-schema-ref-parser/docs/options.html
      http: false,
      file: false,
    },
  });

  const validator = new Validator({
    // See validateBrickInputOutput for comments on the $id.
    $id: "https://app.pixiebrix.com/schemas/value",
    // See validateBrickInputOutput for comments on the casting.
    ...(validatorSchema as ValidatorSchema),
  });
  validator.addSchema(refs.values() as ValidatorSchema);
  return validator.validate(instance ?? null);
}

/**
 * Synchronously validates a package definition against the schema for its kind.
 *
 * Does not de-reference the schema because that would be async. All the built-ins are included in the extension
 * distribution, so they are available to be added directly.
 *
 * @param kind the package definition kind.
 * @param instance the package definition, typically a RegistryPackage
 * @see RegistryPackage
 */
export function validatePackageDefinition(
  kind: keyof typeof KIND_SCHEMAS,
  instance: unknown,
): ValidationResult {
  // eslint-disable-next-line security/detect-object-injection -- keyof check
  const originalSchema = KIND_SCHEMAS[kind];

  if (originalSchema == null) {
    // `strictNullChecks` isn't satisfied with the keyof parameter type
    throw new Error(`Unknown kind: ${kind}`);
  }

  // The API for packages add an updated_at and sharing property to config, which is reflected on RegistryPackage type:
  // https://github.com/pixiebrix/pixiebrix-app/blob/368a0116edad2c115ae370b651f109619e621745/api/serializers/brick.py#L139-L139
  const schemaWithMetadata = cloneDeep(originalSchema);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- `properties` is always defined on these schemas
  schemaWithMetadata.properties!.updated_at = {
    type: "string",
    format: "date-time",
  };

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- `properties` is always defined on these schemas
  schemaWithMetadata.properties!.sharing = {
    // Exact metadata shape doesn't matter for definition validation
    type: "object",
  };

  const validator = new Validator(schemaWithMetadata);

  // Add the schemas synchronously. Definitions do not reference any external schemas, e.g., integration definitions.
  for (const builtIn of Object.values(BUILT_IN_SCHEMAS)) {
    if (builtIn !== originalSchema) {
      // `validate` throws if there are multiple schemas registered with the same $id
      validator.addSchema(builtIn);
    }
  }

  return validator.validate(instance);
}
