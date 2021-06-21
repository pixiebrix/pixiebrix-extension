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

import { Schema } from "@/core";
import * as Yup from "yup";
import serviceRegistry from "@/services/registry";
import blockRegistry from "@/blocks/registry";
import { locate } from "@/background/locator";
import { DoesNotExistError } from "@/baseRegistry";
import { MissingConfigurationError } from "@/services/errors";
import uniq from "lodash/uniq";
import isPlainObject from "lodash/isPlainObject";
import mapValues from "lodash/mapValues";

const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z_0-9]*$/;

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
    id: Yup.string().test("is-block", "Block not found", (id: string) =>
      blockRegistry.exists(id)
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
    !!BRICK_RUN_METHODS[schema.$ref] ||
    (schema.oneOf ?? []).some(
      (x) => typeof x === "object" && BRICK_RUN_METHODS[x.$ref]
    )
  );
}

export function configSchemaFactory(
  schema: Schema,
  options: Options = { required: false }
): Yup.Schema<unknown> {
  const wrapRequired = (x: any) => (options.required ? x.required() : x);

  if (isBrickSchema(schema)) {
    return Yup.lazy((val) => {
      if (isPlainObject(val)) {
        // console.debug("config is a single block");
        return Yup.lazy(blockSchemaFactory);
      } else {
        // console.debug("config is array of blocks");
        return Yup.array().of(Yup.lazy(blockSchemaFactory)).min(1);
      }
    });
  } else if (schema.type === "object") {
    return Yup.lazy((val) => {
      if (isPlainObject(val)) {
        return Yup.object().shape(
          mapValues(schema.properties, (definition, prop) => {
            if (typeof definition === "boolean") {
              return wrapRequired(Yup.string());
            } else {
              return configSchemaFactory(definition, {
                required: (schema.required ?? []).includes(prop),
              });
            }
          })
        );
      } else {
        return Yup.string();
      }
    });
  } else if (schema.type === "array") {
    if (typeof schema.items === "boolean") {
      throw new Error("Expected schema definition for items, not boolean");
    } else if (Array.isArray(schema.items)) {
      // TODO: implement support for tuples
      // https://github.com/jquense/yup/issues/528
      return Yup.lazy((x) =>
        Array.isArray(x)
          ? wrapRequired(Yup.array())
          : wrapRequired(Yup.string())
      );
    } else {
      const items = schema.items as Schema;
      return Yup.lazy((x) =>
        Array.isArray(x)
          ? wrapRequired(Yup.array().of(configSchemaFactory(items)))
          : wrapRequired(Yup.string())
      );
    }
  } else if (schema.type === "boolean") {
    return Yup.bool();
  } else {
    return wrapRequired(Yup.string());
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
              await serviceRegistry.lookup(value);
            } catch (ex) {
              if (ex instanceof DoesNotExistError) {
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
          .required(`Select a service configuration`)
          .test(
            "is-config",
            "Invalid service configuration",
            async function (value) {
              try {
                await locate(this.parent.id, value);
              } catch (ex) {
                if (ex instanceof MissingConfigurationError) {
                  return this.createError({
                    message: "Configuration no longer available",
                  });
                } else {
                  console.exception(
                    `An error occurred validating service: ${this.parent.id}`
                  );
                }
              }
              return true;
            }
          ),
      })
    )
    .test("unique-keys", "Services must have unique keys", function (value) {
      return value.length === uniq(value.map((x) => x.outputKey)).length;
    });
}

export function extensionValidatorFactory(schema: Schema): Yup.Schema<unknown> {
  return Yup.object().shape({
    label: Yup.string(),
    services: serviceSchemaFactory(),
    config: configSchemaFactory(schema),
  });
}
