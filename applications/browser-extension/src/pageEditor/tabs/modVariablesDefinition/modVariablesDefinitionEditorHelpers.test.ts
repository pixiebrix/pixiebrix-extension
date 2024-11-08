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
  mapDefinitionToFormValues,
  mapFormValuesToDefinition,
} from "@/pageEditor/tabs/modVariablesDefinition/modVariablesDefinitionEditorHelpers";
import { uuidv4 } from "@/types/helpers";

describe("mapDefinitionToFormValues", () => {
  it("maps description", () => {
    expect(
      mapDefinitionToFormValues({
        schema: {
          properties: {
            variableAny: {
              description: "Test description",
            },
          },
        },
      }),
    ).toStrictEqual({
      variables: [
        {
          formReactKey: expect.toBeString(),
          description: "Test description",
          isAsync: false,
          name: "variableAny",
          syncPolicy: "none",
          type: "any",
        },
      ],
    });
  });

  it("maps synchronization policy", () => {
    expect(
      mapDefinitionToFormValues({
        schema: {
          properties: {
            variableAny: {
              "x-sync-policy": "session",
            },
          },
          //  JSONSchema Typescript definitions have x- attribute support
        },
      } as any),
    ).toStrictEqual({
      variables: [
        {
          formReactKey: expect.toBeString(),
          description: undefined,
          isAsync: false,
          name: "variableAny",
          syncPolicy: "session",
          type: "any",
        },
      ],
    });
  });

  it("maps any type", () => {
    expect(
      mapDefinitionToFormValues({
        schema: {
          properties: {
            variableAny: true,
          },
        },
      }),
    ).toStrictEqual({
      variables: [
        {
          formReactKey: expect.toBeString(),
          description: undefined,
          isAsync: false,
          name: "variableAny",
          syncPolicy: "none",
          type: "any",
        },
      ],
    });
  });

  it("maps async any type", () => {
    expect(
      mapDefinitionToFormValues({
        schema: {
          properties: {
            variableAsyncAny: {
              type: "object",
              properties: {
                isSuccess: { type: "boolean" },
                isFetching: { type: "boolean" },
                data: {},
              },
            },
          },
        },
      }),
    ).toStrictEqual({
      variables: [
        {
          formReactKey: expect.toBeString(),
          description: undefined,
          isAsync: true,
          name: "variableAsyncAny",
          syncPolicy: "none",
          type: "any",
        },
      ],
    });
  });

  it("maps simple number", () => {
    expect(
      mapDefinitionToFormValues({
        schema: {
          properties: {
            variableNumber: { type: "number" },
          },
        },
      }),
    ).toStrictEqual({
      variables: [
        {
          formReactKey: expect.toBeString(),
          description: undefined,
          isAsync: false,
          name: "variableNumber",
          syncPolicy: "none",
          type: "number",
        },
      ],
    });
  });

  it("maps async object", () => {
    expect(
      mapDefinitionToFormValues({
        schema: {
          properties: {
            variableAsyncObject: {
              type: "object",
              properties: {
                isSuccess: { type: "boolean" },
                isFetching: { type: "boolean" },
                data: { type: "object" },
              },
            },
          },
        },
      }),
    ).toStrictEqual({
      variables: [
        {
          formReactKey: expect.toBeString(),
          description: undefined,
          isAsync: true,
          name: "variableAsyncObject",
          syncPolicy: "none",
          type: "object",
        },
      ],
    });
  });
});

describe("mapFormValuesToDefinition", () => {
  it("excludes empty name", () => {
    expect(
      mapFormValuesToDefinition({
        variables: [
          {
            formReactKey: uuidv4(),
            name: "",
            description: undefined,
            isAsync: false,
            syncPolicy: "none",
            type: "any",
          },
        ],
      }),
    ).toStrictEqual({
      schema: {
        $schema: "https://json-schema.org/draft/2019-09/schema#",
        properties: {},
        required: [],
        type: "object",
      },
    });
  });

  it("maps number with description", () => {
    expect(
      mapFormValuesToDefinition({
        variables: [
          {
            formReactKey: uuidv4(),
            name: "numberVar",
            description: "A number with a description",
            isAsync: false,
            syncPolicy: "none",
            type: "number",
          },
        ],
      }),
    ).toStrictEqual({
      schema: {
        $schema: "https://json-schema.org/draft/2019-09/schema#",
        properties: {
          numberVar: {
            description: "A number with a description",
            type: "number",
            "x-sync-policy": "none",
          },
        },
        required: [],
        type: "object",
      },
    });
  });

  it("maps async variable with any payload", () => {
    expect(
      mapFormValuesToDefinition({
        variables: [
          {
            formReactKey: uuidv4(),
            name: "asyncVar",
            description: undefined,
            isAsync: true,
            syncPolicy: "none",
            type: "any",
          },
        ],
      }),
    ).toStrictEqual({
      schema: {
        $schema: "https://json-schema.org/draft/2019-09/schema#",
        type: "object",
        required: [],
        properties: {
          asyncVar: {
            type: "object",
            description: undefined,
            "x-sync-policy": "none",
            properties: {
              isLoading: { type: "boolean" },
              isFetching: { type: "boolean" },
              isSuccess: { type: "boolean" },
              isError: { type: "boolean" },
              currentData: {},
              data: {},
              error: { type: "object" },
            },
            required: ["isLoading", "isFetching", "isSuccess", "isError"],
          },
        },
      },
    });
  });
});
