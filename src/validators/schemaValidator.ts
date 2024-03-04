/* eslint-disable security/detect-object-injection */
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
import integrationRegistry from "@/integrations/registry";
import { cloneDeep, pickBy, trimEnd } from "lodash";
import urljoin from "url-join";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import {
  type FileInfo,
  type ResolverOptions,
} from "@apidevtools/json-schema-ref-parser/dist/lib/types";
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
import googleSheetIdSchema from "@schemas/googleSheetId.json";
import { inputProperties, minimalSchemaFactory } from "@/utils/schemaUtils";
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

const BASE_SCHEMA_URI = "https://app.pixiebrix.com/schemas/";

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
 * $ref resolver that fetches the integration definition from the integration definition registry.
 */
// eslint-disable-next-line local-rules/persistBackgroundData -- Static
const integrationDefinitionResolver: ResolverOptions = {
  order: 1,
  canRead: /^https:\/\/app\.pixiebrix\.com\/schemas\/services\/\S+/i,
  async read(file: FileInfo) {
    // https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API#making_matching_groups_repeated
    const pattern = new URLPattern({ pathname: "/schemas/services/:id+" });
    const result = pattern.exec(file.url);

    if (!result) {
      throw new Error(`Invalid integration URL ${file.url}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-unnecessary-type-assertion -- linter and compiler disagree
    const integrationId = result.pathname.groups.id!;

    try {
      const integrationDefinition = await integrationRegistry.lookup(
        validateRegistryId(integrationId),
      );

      // TODO: provide option on whether or not to include secrets/sanitize. Configuration forms need secrets
      const sanitizedProperties = pickBy(
        inputProperties(integrationDefinition.schema),
        // `includes` type is annoyingly narrow: https://github.com/microsoft/TypeScript/issues/26255
        (x: JSONSchema7) =>
          x.$ref == null || !REF_SECRETS.includes(trimEnd(x.$ref, "#")),
      );

      return {
        // Don't include $id because it might occur multiple times and $RefParser.dereference breaks on duplicate ids
        type: "object",
        // Strip out the properties containing secrets because those will be excluded as this point
        properties: sanitizedProperties,
        required: (integrationDefinition.schema.required ?? []).filter(
          (x) => x in sanitizedProperties,
        ),
      };
    } catch (error) {
      console.warn("Error resolving integration definition schema", error);
      // Don't block on failure
      return minimalSchemaFactory();
    }
  },
} as const;

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

    const schema = BUILT_IN_SCHEMAS[url];

    if (schema != null) {
      // Strip off $id because $RefParser.dereference on duplicate $ids in a schema
      const { $id, ...other } = schema;
      return other;
    }

    throw new Error(`Unknown file ${file.url}`);
  },
} as const;

/**
 * Returns a new copy of schema with all $ref de-referenced.
 * @param schema the original schema that may contain $ref
 * @see $RefParser.dereference
 */
export async function dereference(schema: Schema): Promise<Schema> {
  // $RefParser.dereference modifies the schema in place
  const clone = cloneDeep(schema);

  try {
    return await ($RefParser.dereference(clone, {
      // Disable built-in resolvers
      // https://apitools.dev/json-schema-ref-parser/docs/options.html
      resolve: {
        integrationDefinitionResolver,
        builtInSchemaResolver,
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
  const dereferenced = await dereference(schema);

  const validator = new Validator({
    $id: urljoin(BASE_SCHEMA_URI, "block"),
    ...dereferenced,
  } as ValidatorSchema);

  return validator.validate(instance ?? null);
}

/**
 * Synchronously validates a package definition against the schema for its kind.
 *
 * Does not de-reference the schema because that would be async. All the built-ins are included in the extension
 * distribution, so they are available to be added directly.
 *
 * @param kind the package definition kind.
 * @param instance the package definition
 */
export function validatePackageDefinition(
  kind: keyof typeof KIND_SCHEMAS,
  instance: unknown,
): ValidationResult {
  const schema = KIND_SCHEMAS[kind];

  if (schema == null) {
    // `strictNullChecks` isn't satisfied with the kind parameter type
    throw new Error(`Unknown kind: ${kind}`);
  }

  const validator = new Validator(schema);

  for (const builtIn of Object.values(BUILT_IN_SCHEMAS)) {
    if (builtIn !== schema) {
      validator.addSchema(builtIn);
    }
  }

  return validator.validate(instance);
}
