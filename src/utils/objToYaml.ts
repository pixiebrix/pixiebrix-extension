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

import yaml from "yaml";

export const objToYaml = (obj: Record<string, unknown>) => {
  const yamlDocument = new yaml.Document();
  yamlDocument.contents = obj;
  return yamlDocument.toString();
};

export const brickToYaml = (brickConfig: Record<string, unknown>) => {
  // Ordering some of the root keys
  const {
    apiVersion,
    kind,
    metadata,
    inputSchema,
    outputSchema,
    ...rest
  } = brickConfig;

  const configWithSortedKeys: Record<string, unknown> = {};

  if (typeof apiVersion !== "undefined") {
    configWithSortedKeys.apiVersion = apiVersion;
  }

  if (typeof kind !== "undefined") {
    configWithSortedKeys.kind = kind;
  }

  if (typeof metadata !== "undefined") {
    configWithSortedKeys.metadata = metadata;
  }

  if (typeof inputSchema !== "undefined") {
    configWithSortedKeys.inputSchema = inputSchema;
  }

  if (typeof outputSchema !== "undefined") {
    configWithSortedKeys.outputSchema = outputSchema;
  }

  return objToYaml({
    ...configWithSortedKeys,
    ...rest,
  });
};
