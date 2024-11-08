/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import {
  dereferenceForYup,
  validateBrickInputOutput,
  validatePackageDefinition,
} from "./schemaValidator";
import { loadBrickYaml } from "../runtime/brickYaml";
import serviceText from "@/contrib/raw/hunter.txt";
import jqueryReaderDefinition from "@/contrib/readers/apartments-reader.yaml";
import emptyJQueryReaderDefinition from "@/contrib/readers/empty-jquery-reader.yaml";
import emberJsReaderDefinition from "@/contrib/readers/linkedin-organization-reader.yaml";
import windowReader from "@/contrib/readers/trello-card-reader.yaml";
import reactReader from "@/contrib/readers/redfin-reader.yaml";
import { type Schema, SCHEMA_EMPTY_OBJECT } from "@/types/schemaTypes";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { timestampFactory } from "../testUtils/factories/stringFactories";
import { personalSharingDefinitionFactory } from "../testUtils/factories/registryFactories";
import { keyAuthIntegrationDefinitionFactory } from "../testUtils/factories/integrationFactories";
import integrationRegistry from "../integrations/registry";
import { fromJS } from "../integrations/UserDefinedIntegration";
import { metadataFactory } from "../testUtils/factories/metadataFactory";

beforeEach(() => {
  integrationRegistry.clear();
});

describe("validateKind", () => {
  test("can validate integration definition", async () => {
    const json = loadBrickYaml(serviceText) as UnknownObject;
    const result = validatePackageDefinition("service", json);
    expect(result.errors).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  test.each([
    jqueryReaderDefinition,
    emptyJQueryReaderDefinition,
    emberJsReaderDefinition,
    reactReader,
    windowReader,
  ])("can validate reader definition: %#", (config) => {
    const result = validatePackageDefinition("reader", config);
    expect(result.errors).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  test("can validate integration with timestamp/sharing metadata", async () => {
    const json = loadBrickYaml(serviceText) as UnknownObject;

    json.updated_at = timestampFactory();
    json.sharing = personalSharingDefinitionFactory();

    const result = validatePackageDefinition("service", json);

    expect(result.errors).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  test("fails on additional unknown property", async () => {
    const json = loadBrickYaml(serviceText) as UnknownObject;
    json.foobar = "Hello, world!";
    const result = validatePackageDefinition("service", json);

    expect(result.errors).toStrictEqual([
      {
        error: 'Property "foobar" does not match additional properties schema.',
        instanceLocation: "#",
        keyword: "additionalProperties",
        keywordLocation: "#/additionalProperties",
      },
      // The exact error here doesn't really matter:
      {
        error: "False boolean schema.",
        instanceLocation: "#/foobar",
        keyword: "false",
        keywordLocation: "#/foobar",
      },
    ]);

    expect(result.valid).toBe(false);
  });
});

describe("validateBrickInputOutput", () => {
  test("can validate DB ref parameter", async () => {
    const inputSchema = {
      type: "object",
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      properties: {
        db: {
          $ref: "https://app.pixiebrix.com/schemas/database#",
        },
      },
    } as Schema;
    const inputInstance = {
      db: uuidv4(),
    };

    const result = await validateBrickInputOutput(inputSchema, inputInstance);
    expect(result.errors).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  it("can validate empty brick input schema (frozen object)", async () => {
    const result = await validateBrickInputOutput(SCHEMA_EMPTY_OBJECT, {});
    expect(result.errors).toHaveLength(0);
    expect(result.valid).toBe(true);
  });
});

const integrationDefinition = keyAuthIntegrationDefinitionFactory({
  metadata: metadataFactory({
    id: validateRegistryId("@scope/collection/name"),
  }),
  inputSchema: {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      apiKey: {
        $ref: "https://app.pixiebrix.com/schemas/key#",
        title: "API Key",
      },
      baseURL: {
        type: "string",
      },
    },
    required: ["apiKey", "baseURL"],
  },
});

describe("dereference", () => {
  test("can dereference and sanitize schema with an integration", async () => {
    integrationRegistry.register([fromJS(integrationDefinition)]);

    await expect(
      dereferenceForYup(
        {
          type: "object",
          properties: {
            service: {
              $ref: "https://app.pixiebrix.com/schemas/services/@scope/collection/name",
            },
          },
        },
        {
          sanitizeIntegrationDefinitions: true,
        },
      ),
    ).resolves.toStrictEqual({
      properties: {
        service: {
          $id: "https://app.pixiebrix.com/schemas/services/@scope/collection/name",
          properties: {
            // `apiKey` is stripped because sanitizeIntegrationDefinitions is true
            baseURL: {
              type: "string",
            },
          },
          required: ["baseURL"],
          type: "object",
        },
      },
      type: "object",
    });
  });

  test("can dereference schema without an integration", async () => {
    integrationRegistry.register([fromJS(integrationDefinition)]);

    await expect(
      dereferenceForYup(
        {
          type: "object",
          properties: {
            service: {
              $ref: "https://app.pixiebrix.com/schemas/services/@scope/collection/name",
            },
          },
        },
        {
          sanitizeIntegrationDefinitions: false,
        },
      ),
    ).resolves.toStrictEqual({
      properties: {
        service: {
          ...integrationDefinition.inputSchema,
          $id: "https://app.pixiebrix.com/schemas/services/@scope/collection/name",
        },
      },
      type: "object",
    });
  });
});
