import { brickToYaml } from "./objToYaml";

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
        version: "1.0.0",
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
        version: "1.0.0",
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
