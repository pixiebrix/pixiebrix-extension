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

import yaml from "js-yaml";
import { UnknownObject } from "@/types";

/**
 * @param tag the tag name, without the leading `!`
 */
function createExpression(tag: string): yaml.Type {
  // See https://github.com/nodeca/js-yaml/blob/master/examples/custom_types.js

  return new yaml.Type("!" + tag, {
    kind: "scalar",

    resolve: (data) => typeof data === "string",

    construct: (data) => ({
      __type__: tag,
      __value__: data,
    }),

    predicate: (data) =>
      typeof data === "object" &&
      "__type__" in data &&
      (data as UnknownObject).__type__ === tag,

    represent: (data) => (data as UnknownObject).__value__,
  });
}

const RUNTIME_SCHEMA = yaml.DEFAULT_SCHEMA.extend([
  createExpression("var"),
  createExpression("mustache"),
  createExpression("handlebars"),
  createExpression("nunjucks"),
]);

/**
 * Load brick YAML, with support for the custom tags for expressions.
 * @param config
 */
export function loadBrickYaml(config: string): unknown {
  return yaml.load(config, { schema: RUNTIME_SCHEMA });
}

export function dumpBrickYaml(
  obj: unknown,
  options: yaml.DumpOptions = {}
): string {
  return yaml.dump(obj, { ...options, schema: RUNTIME_SCHEMA });
}
