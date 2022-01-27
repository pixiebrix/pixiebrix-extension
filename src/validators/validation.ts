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

import { Schema } from "@/core";
import * as Yup from "yup";
import serviceRegistry from "@/services/registry";
import blockRegistry from "@/blocks/registry";
import { services } from "@/background/messenger/api";
import { DoesNotExistError } from "@/baseRegistry";
import { MissingConfigurationError } from "@/services/errors";
import { uniq, mapValues, isPlainObject } from "lodash";
import { validateRegistryId, isUUID } from "@/types/helpers";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";

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

function blockSchemaFactory(): Yup.Schema<Record<string, unknown>> {
  return Yup.object().shape({
    id: Yup.string().test("is-block", "Block not found", async (id: string) =>
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- false positive
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
): Yup.Schema<unknown> {
  const wrapRequired = (x: any) => (required ? x.required() : x);

  if (isBrickSchema(schema)) {
    return Yup.lazy((value) => {
      if (isPlainObject(value)) {
        return Yup.lazy(blockSchemaFactory);
      }

      return Yup.array().of(Yup.lazy(blockSchemaFactory)).min(1);
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

      const items = schema.items as Schema;
      return Yup.lazy((x) =>
        Array.isArray(x)
          ? wrapRequired(Yup.array().of(configSchemaFactory(items)))
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

function serviceSchemaFactory(): Yup.Schema<unknown> {
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

export function extensionValidatorFactory(schema: Schema): Yup.Schema<unknown> {
  return Yup.object().shape({
    label: Yup.string(),
    services: serviceSchemaFactory(),
    config: configSchemaFactory(schema),
  });
}
