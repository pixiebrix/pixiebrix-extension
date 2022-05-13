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

import { brickToYaml } from "./objToYaml";
import { validateSemVerString } from "@/types/helpers";

describe("brickToYaml", () => {
  test("serializes arbitrary object", () => {
    const config = {
      foo: "bar",
      lorem: "ipsum",
    };

    const expected = `foo: bar
lorem: ipsum
`;

    const actual = brickToYaml(config);

    expect(actual).toBe(expected);
  });

  test("serializes a config with only known props", () => {
    const config = {
      kind: "service",
      metadata: {
        id: "google/api",
        name: "Google API",
        version: validateSemVerString("1.0.0"),
        description: "Generic Google API authentication via API key",
      },
      apiVersion: "v1",
      inputSchema: {
        type: "object",
        $schema: "https://json-schema.org/draft/2019-09/schema#",
        required: ["apiKey"],
        properties: {
          apiKey: {
            $ref: "https://app.pixiebrix.com/schemas/key#",
            description: "Your API key",
          },
        },
      },
      outputSchema: {
        type: "object",
        required: ["translatedText"],
        properties: {
          translatedText: {
            type: "string",
          },
        },
        additionalProperties: true,
      },
    };

    const expected = `apiVersion: v1
kind: service
metadata:
  id: google/api
  name: Google API
  version: 1.0.0
  description: Generic Google API authentication via API key
inputSchema:
  type: object
  $schema: https://json-schema.org/draft/2019-09/schema#
  required:
    - apiKey
  properties:
    apiKey:
      $ref: https://app.pixiebrix.com/schemas/key#
      description: Your API key
outputSchema:
  type: object
  required:
    - translatedText
  properties:
    translatedText:
      type: string
  additionalProperties: true
`;

    const actual = brickToYaml(config);

    expect(actual).toBe(expected);
  });

  test("sorts config root keys", () => {
    const config = {
      kind: "service",
      metadata: {
        id: "google/api",
        name: "Google API",
        version: validateSemVerString("1.0.0"),
        description: "Generic Google API authentication via API key",
      },
      apiVersion: "v1",
      inputSchema: {
        type: "object",
        $schema: "https://json-schema.org/draft/2019-09/schema#",
        required: ["apiKey"],
        properties: {
          apiKey: {
            $ref: "https://app.pixiebrix.com/schemas/key#",
            description: "Your API key",
          },
        },
      },
      authentication: {
        params: {
          key: "{{apiKey}}",
        },
      },
      outputSchema: {
        type: "object",
        required: ["translatedText"],
        properties: {
          translatedText: {
            type: "string",
          },
        },
        additionalProperties: true,
      },
    };

    const expected = `apiVersion: v1
kind: service
metadata:
  id: google/api
  name: Google API
  version: 1.0.0
  description: Generic Google API authentication via API key
inputSchema:
  type: object
  $schema: https://json-schema.org/draft/2019-09/schema#
  required:
    - apiKey
  properties:
    apiKey:
      $ref: https://app.pixiebrix.com/schemas/key#
      description: Your API key
outputSchema:
  type: object
  required:
    - translatedText
  properties:
    translatedText:
      type: string
  additionalProperties: true
authentication:
  params:
    key: "{{apiKey}}"
`;

    const actual = brickToYaml(config);

    expect(actual).toBe(expected);
  });
});
