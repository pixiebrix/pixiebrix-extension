/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { BlockConfig, BlockPipeline } from "@/blocks/types";
import blockRegistry from "@/blocks/registry";
import { inputProperties } from "@/helpers";
import { UnknownObject } from "@/types";
import { Expression, SchemaDefinition, TemplateEngine } from "@/core";
import { cloneDeep } from "lodash";
import { isSelectField } from "@/components/fields/schemaFields/widgets/v3/SchemaSelectWidget";

export function stringToExpression(
  value: unknown,
  templateEngine: TemplateEngine
): Expression {
  if (typeof value !== "string") {
    throw new TypeError("Expected string for value");
  }

  const type = /^@\S+$/g.test(value) ? "var" : templateEngine;
  return {
    __type__: type,
    __value__: value,
  };
}

async function upgradeBlock(blockConfig: BlockConfig): Promise<void> {
  const { inputSchema } = await blockRegistry.lookup(blockConfig.id);
  const inputProps = inputProperties(inputSchema);

  // `v1`/`v2` use mustache by default
  const templateEngine = blockConfig.templateEngine ?? "mustache";

  await Promise.all(
    Object.keys(blockConfig.config).map(async (name) => {
      await upgradeValue(
        blockConfig.config,
        name,
        // eslint-disable-next-line security/detect-object-injection -- name comes from config keys
        inputProps[name],
        templateEngine
      );
    })
  );

  if (blockConfig.if) {
    blockConfig.if = stringToExpression(blockConfig.if, templateEngine);
  }

  // Top-level `templateEngine` not supported in v3
  delete blockConfig.templateEngine;
}

async function upgradeValue(
  config: UnknownObject,
  fieldName: string,
  fieldSchema: SchemaDefinition,
  templateEngine: TemplateEngine
): Promise<void> {
  if (typeof fieldSchema === "boolean") {
    return;
  }

  // eslint-disable-next-line security/detect-object-injection -- caller iterates over keys
  const value = config[fieldName];
  if (typeof value === "object" && fieldSchema) {
    if (
      Array.isArray(value) &&
      fieldSchema.type === "array" &&
      typeof fieldSchema.items !== "boolean"
    ) {
      // For json-schema arrays, each item in the value array gets a schema in the same
      // position in the itemSchemas array
      const itemSchemas: SchemaDefinition[] = [];
      const { additionalItems, items } = fieldSchema;

      // The items field of the array json schema, if defined, is either a single schema
      // definition, or an array of schema definitions. In the cases where the items field
      // is either a single schema, or an array that has fewer schema definitions than
      // the value array, we need to infer the schema for each remaining item by its type.
      // The value array is assumed to be valid according to the given schema, so we're
      // going to roughly match the remaining items by typeof, which overlaps with
      // JSONSchema7TypeName for most things (e.g. "string", "number", "boolean", etc).
      const additionalItemSchemasByType: Record<string, SchemaDefinition> = {};

      if (Array.isArray(items)) {
        // If the items field is an array, then those schemas are assumed to match with the
        // item in the value array at the same position.
        itemSchemas.push(...items);
      } else if (typeof items !== "boolean" && items) {
        // If the items field is a single schema definition, then we start with this one.
        itemSchemas.push(items);
        // If the single items schema definition also has a single string value for its
        // type field, then we add this to our additionalItemSchemasByType dictionary.
        // This can then be used to match any remaining items in the value array of the
        // same typeof value.
        if (typeof items.type === "string") {
          additionalItemSchemasByType[items.type] = items;
        }
      }

      // The additionalItems field, if defined, is either a single schema definition, or
      // an array of schemas. It will be used to match any extra items in the value array
      // beyond those with matching position values in the itemSchemas array.
      if (typeof additionalItems !== "boolean" && additionalItems) {
        if (typeof additionalItems.type === "string") {
          // If additionalItems is a single schema, and that schema has a single, string
          // type value, then we add this to our dictionary to match extra items in the
          // value array.
          additionalItemSchemasByType[additionalItems.type] = additionalItems;
        }

        // If the oneOf array is populated on the additionalItems field of the schema,
        // then we iterate through its items (schemas), adding each to our dictionary
        // if it has a string type value.
        if (additionalItems.oneOf) {
          for (const prop of additionalItems.oneOf) {
            if (typeof prop !== "boolean" && typeof prop?.type === "string") {
              additionalItemSchemasByType[prop.type] = prop;
            }
          }
        }
      }

      // Now, we iterate through our value array, and use the dictionary we've built
      // to assign each extra item a schema in our itemSchemas array.
      for (const [index, element] of value.entries()) {
        if (index >= itemSchemas.length) {
          // eslint-disable-next-line security/detect-object-injection
          itemSchemas[index] = additionalItemSchemasByType[typeof element];
        }
      }

      // Finally, since we should now have an item schema for each item in the value
      // array, we can recursively call this function again with each item and its
      // schema from the itemSchemas array, with the current value as the parent.
      await Promise.all(
        value.map(async (element, index) => {
          await upgradeValue(
            // We have to do a kind of nasty cast here in order for the function to
            // work with an array and index values, but thanks to javascript under
            // the hood, this works fine. Looking up array items by array["<index>"]
            // is valid javascript.
            (value as unknown) as UnknownObject,
            index.toString(),
            // eslint-disable-next-line security/detect-object-injection
            itemSchemas[index],
            templateEngine
          );
        })
      );
    } else if (fieldSchema.type === "object") {
      // This section handling object values works fundamentally the same way as
      // the array section above (detailed comments there). Property schemas are
      // matched up based on the object property name rather than array position.
      // We look at the properties and additionalProperties fields of the schema,
      // as opposed to the items and additionalItems fields for arrays.

      const propertySchemas = fieldSchema.properties ?? {};

      if (
        typeof fieldSchema.additionalProperties !== "boolean" &&
        fieldSchema.additionalProperties
      ) {
        const additionalPropsByType: Record<string, SchemaDefinition> = {};
        if (typeof fieldSchema.additionalProperties.type === "string") {
          additionalPropsByType[fieldSchema.additionalProperties.type] =
            fieldSchema.additionalProperties;
        }

        if (fieldSchema.additionalProperties.oneOf) {
          for (const prop of fieldSchema.additionalProperties.oneOf) {
            if (typeof prop !== "boolean" && typeof prop?.type === "string") {
              additionalPropsByType[prop.type] = prop;
            }
          }
        }

        for (const name of Object.keys(value).filter(
          (key) => !(key in propertySchemas)
        )) {
          // eslint-disable-next-line security/detect-object-injection
          const subValue = (value as UnknownObject)[name];
          // eslint-disable-next-line security/detect-object-injection
          propertySchemas[name] = additionalPropsByType[typeof subValue];
        }
      }

      await Promise.all(
        Object.keys(value).map(async (name) => {
          await upgradeValue(
            value as UnknownObject,
            name,
            // eslint-disable-next-line security/detect-object-injection
            propertySchemas[name],
            templateEngine
          );
        })
      );
    }
  } else if (
    (fieldSchema?.type === "string" && fieldSchema?.format === "selector") ||
    (fieldSchema && isSelectField(fieldSchema))
  ) {
    // NOP: the Page Editor doesn't support templated selectors, and we don't want to convert enum values
  } else if (typeof value === "string") {
    // eslint-disable-next-line security/detect-object-injection -- caller iterates over keys
    config[fieldName] = stringToExpression(value, templateEngine);
  }
}

/**
 * Attempt to upgrade the blocks in a pipeline from api v2 to v3
 */
export async function upgradePipelineToV3(
  blockPipeline: BlockPipeline
): Promise<BlockPipeline> {
  const cloned = cloneDeep(blockPipeline);
  await Promise.all(
    cloned.map(async (block) => {
      await upgradeBlock(block);
    })
  );
  return cloned;
}
