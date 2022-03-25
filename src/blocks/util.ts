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

import { IBlock, RegistryId, Schema } from "@/core";
import { UnknownObject } from "@/types";
import { castArray, mapValues, pickBy } from "lodash";
import { removeUndefined } from "@/utils";
import { BlockConfig, BlockPipeline } from "@/blocks/types";
import { PipelineConfigurationError } from "@/blocks/errors";
import blockRegistry from "@/blocks/registry";
import pDefer from "p-defer";

export function isOfficial(id: RegistryId): boolean {
  return id.startsWith("@pixiebrix/");
}

/**
 * Returns the initial state for a blockConfig.
 * @param schema the JSON Schema
 */
export function defaultBlockConfig(schema: Schema): UnknownObject {
  if (typeof schema.properties === "object") {
    return removeUndefined(
      mapValues(
        pickBy(
          schema.properties,
          (x) => typeof x !== "boolean" && x.default && !x.anyOf && !x.oneOf
        ),
        (propertySchema: Schema) => {
          if (typeof propertySchema.default !== "object") {
            return propertySchema.default;
          }
        }
      )
    ) as UnknownObject;
  }

  return {};
}

/** Return block definitions for all blocks referenced in a pipeline */
export async function blockList(
  config: BlockConfig | BlockPipeline
): Promise<IBlock[]> {
  return Promise.all(
    castArray(config).map(async ({ id }) => {
      if (id == null) {
        throw new PipelineConfigurationError(
          "Pipeline stage is missing a block id",
          config
        );
      }

      return blockRegistry.lookup(id);
    })
  );
}

/**
 * Attach a stylesheet to the host page.
 *
 * Use with the `?loadAsUrl` import modifier, e.g.:
 *
 *  import stylesheetUrl from "intro.js/introjs.css?loadAsUrl";
 */
export async function attachStylesheet(url: string): Promise<HTMLElement> {
  const link = document.createElement("link");
  link.setAttribute("rel", "stylesheet");
  link.setAttribute("href", url);

  const deferredPromise = pDefer<HTMLElement>();

  // Try to avoid a FOUC: https://webkit.org/blog/66/the-fouc-problem/ by waiting for the stylesheet to have had a
  // chance to load.
  // The load event fires once the stylesheet and all of its imported content has been loaded and parsed, and
  // immediately before the styles start being applied to the content.
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#stylesheet_load_events
  link.addEventListener("load", () => {
    requestAnimationFrame(() => {
      deferredPromise.resolve(link);
    });
  });

  document.head.append(link);

  return deferredPromise.promise;
}
