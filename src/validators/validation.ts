import { IBlock, Schema, ServiceLocator } from "@/core";
import * as Yup from "yup";
import serviceRegistry from "@/services/registry";
import blockRegistry from "@/blocks/registry";
import { DoesNotExistError } from "@/baseRegistry";
import {
  MissingConfigurationError,
  MultipleConfigurationError,
} from "@/services/errors";
import uniq from "lodash/uniq";
import isPlainObject from "lodash/isPlainObject";
import mapValues from "lodash/mapValues";

const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z_0-9]*$/;

const BRICK_RUN_METHODS = {
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

function blockSchemaFactory(val: any): Yup.Schema<object> {
  if (val && val.hasOwnProperty("id")) {
    let block: IBlock;
    try {
      block = blockRegistry.lookup(val.id);
    } catch (ex) {
      if (ex instanceof DoesNotExistError) {
        return Yup.object().shape({
          id: Yup.string().test("is-block", "Unknown block", () => true),
        });
      }
      throw ex;
    }
    return Yup.object().shape({
      id: Yup.string(),
      templateEngine: Yup.string()
        .oneOf(["nunjucks", "mustache", "handlebars"])
        .notRequired(),
      outputKey: Yup.string().matches(IDENTIFIER_REGEX).notRequired(),
      config: configSchemaFactory(block.inputSchema),
    });
  } else {
    return Yup.object().shape({
      id: Yup.string().required(),
    });
  }
}

export function configSchemaFactory(
  schema: Schema,
  options: Options = { required: false }
): Yup.Schema<unknown> {
  const wrapRequired = (x: any) => (options.required ? x.required() : x);

  if (BRICK_RUN_METHODS.hasOwnProperty(schema.$ref)) {
    return Yup.lazy((val) => {
      if (isPlainObject(val)) {
        return Yup.lazy(blockSchemaFactory);
      } else {
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

function serviceSchemaFactory(locator: ServiceLocator): Yup.Schema<unknown> {
  return Yup.array()
    .of(
      Yup.object().shape({
        id: Yup.string().test("is-service", "Unknown service", (value) => {
          try {
            serviceRegistry.lookup(value);
          } catch (ex) {
            if (ex instanceof DoesNotExistError) {
              return false;
            }
          }
          return true;
        }),
        outputKey: Yup.string()
          .required()
          .matches(IDENTIFIER_REGEX, "Not a valid identifier"),
        // https://github.com/jquense/yup/issues/954
        config: Yup.string().test(
          "is-config",
          "Invalid service configuration",
          async function (value) {
            try {
              await locator(this.parent.id, value);
            } catch (ex) {
              if (ex instanceof MissingConfigurationError) {
                if (ex.id) {
                  return this.createError({
                    message: "Configuration no longer available",
                  });
                } else {
                  return this.createError({
                    message: `No services configured for ${this.parent.id}`,
                  });
                }
              } else if (ex instanceof MultipleConfigurationError) {
                return this.createError({
                  message: `You must select a configuration because conflicting configurations exist for ${this.parent.id}`,
                });
              } else {
                return false;
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

export function extensionValidatorFactory(
  locator: ServiceLocator,
  schema: Schema
): Yup.Schema<unknown> {
  return Yup.object().shape({
    label: Yup.string(),
    services: serviceSchemaFactory(locator),
    config: configSchemaFactory(schema),
  });
}
