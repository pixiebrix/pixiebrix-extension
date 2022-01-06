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
  if (typeof value === "object") {
    if (fieldSchema.type === "object" || fieldSchema.type === "array") {
      const subProps = fieldSchema.properties ?? {};

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
            if (typeof prop !== "boolean" && typeof prop.type === "string") {
              additionalPropsByType[prop.type] = prop;
            }
          }
        }

        for (const name of Object.keys(value).filter(
          (key) => !(key in subProps)
        )) {
          // eslint-disable-next-line security/detect-object-injection
          const subValue = (value as UnknownObject)[name];
          // eslint-disable-next-line security/detect-object-injection
          subProps[name] = additionalPropsByType[typeof subValue];
        }
      }

      await Promise.all(
        Object.keys(value).map(async (name) => {
          await upgradeValue(
            value as UnknownObject,
            name,
            // eslint-disable-next-line security/detect-object-injection
            subProps[name],
            templateEngine
          );
        })
      );
    }
  } else if (
    fieldSchema.type === "string" &&
    fieldSchema.format === "selector"
  ) {
    // NOP: the Page Editor doesn't support templated selectors
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
