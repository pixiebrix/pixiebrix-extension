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

import { IExtension, RegistryId, UUID } from "./core";
import { randomWords } from "./testHelpers";

const config = {
  apiVersion: "v1",
  kind: "component",
  metadata: {
    id: "test/1",
    version: "1.0.0",
    name: "Text config",
    description: "Component's config made for testing",
  },
  inputSchema: {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {},
    required: [] as string[],
  },
  pipeline: [
    {
      id: "@pixiebrix/browser/open-tab",
      config: {
        url: "http://www.amazon.com/s",
        params: {
          url:
            "search-alias={{{department}}}{{^department}}all{{/department}}&field-keywords={{{query}}}",
        },
      },
    },
  ],
};

export const getMockedExtension: (
  extensionProps?: Partial<IExtension>
) => IExtension = (extensionProps) => ({
  id: randomWords() as UUID,
  extensionPointId: randomWords() as RegistryId,
  _deployment: null,
  _recipe: null,
  label: randomWords(),
  templateEngine: null,
  permissions: null,
  definitions: null,
  services: [],
  optionsArgs: null,
  config,
  active: true,
  ...extensionProps,
});
