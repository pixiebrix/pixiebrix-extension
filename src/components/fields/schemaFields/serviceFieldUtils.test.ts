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

import { OutputKey, UUID } from "@/core";
import { FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import {
  blockConfigFactory,
  formStateFactory,
  uuidSequence,
} from "@/testUtils/factories";
import { toExpression } from "@/testUtils/testHelpers";
import { validateRegistryId } from "@/types/helpers";
import { selectServiceVariables } from "./serviceFieldUtils";

describe("selectVariables", () => {
  test("selects nothing when no services used", () => {
    const formState = formStateFactory(undefined, [
      blockConfigFactory({
        config: {
          data: false,
        },
      }),
      blockConfigFactory({
        config: {
          input: toExpression("nunjucks", "foo: {{ @foo }}"),
        },
      }),
    ]);

    const actual = selectServiceVariables(formState);
    expect(actual).toEqual(new Set());
  });

  test("selects top level vars", () => {
    const serviceConfig = {
      id: "@test/service",
      instanceId: uuidSequence(1),
      input: toExpression("var", "@foo"),
    };

    const formState = formStateFactory(undefined, [
      blockConfigFactory({
        config: serviceConfig,
      }),
    ]);

    const actual = selectServiceVariables(formState);
    expect(actual).toEqual(new Set(["@foo"]));
  });

  test("do not select variable with path seperator", () => {
    const formState = formStateFactory(undefined, [
      blockConfigFactory({
        config: {
          foo: toExpression("var", "@foo.bar"),
        },
      }),
    ]);

    const actual = selectServiceVariables(formState);
    expect(actual).toEqual(new Set([]));
  });

  test("selects nested vars", () => {
    const documentWithButtonConfig = {
      id: "@test/document",
      config: {
        body: [
          {
            type: "button",
            config: {
              title: "Action",
              onClick: toExpression("pipeline", [
                {
                  id: "@test/service",
                  instanceId: uuidSequence(2),
                  config: {
                    input: toExpression("var", "@foo"),
                  },
                },
              ]),
            },
          },
        ],
      },
      instanceId: uuidSequence(1),
    };

    const formState = formStateFactory(undefined, [
      blockConfigFactory({
        config: documentWithButtonConfig,
      }),
    ]);

    const actual = selectServiceVariables(formState);
    expect(actual).toEqual(new Set(["@foo"]));
  });

  test("selects nested pipelines", () => {
    const documentWithButtonConfig = {
      id: "@test/document",
      config: {
        body: [
          {
            type: "button",
            config: {
              title: "Action",
              onClick: toExpression("pipeline", [
                {
                  id: "@test/brick",
                  config: {
                    input: toExpression("var", "@foo"),
                  },
                },
                {
                  id: "@test/if",
                  config: {
                    if: toExpression("pipeline", [
                      {
                        id: "@test/brick",
                        config: {
                          input: toExpression("var", "@bar"),
                        },
                      },
                    ]),
                  },
                },
              ]),
            },
          },
        ],
      },
      instanceId: uuidSequence(1),
    };

    const formState = formStateFactory(undefined, [
      blockConfigFactory({
        config: documentWithButtonConfig,
      }),
    ]);

    const actual = selectServiceVariables(formState);
    expect(actual).toEqual(new Set(["@foo", "@bar"]));
  });

  test("document with Form with database storage", () => {
    // This is a sample of an actual form state with Custom form inside a Document
    const formState: FormState = {
      uuid: "a98f5c19-96a2-4c69-89ed-c8e9b7059000" as UUID,
      apiVersion: "v3",
      installed: true,
      label: "Document",
      services: [
        {
          id: validateRegistryId("@pixiebrix/api"),
          outputKey: "pixiebrix" as OutputKey,
          config: null,
        },
      ],
      permissions: {},
      optionsArgs: {},
      type: "actionPanel",
      recipe: null,
      extension: {
        blockPipeline: [
          {
            id: validateRegistryId("@pixiebrix/document"),
            config: {
              body: [
                {
                  type: "pipeline",
                  config: {
                    pipeline: {
                      __type__: "pipeline",
                      __value__: [
                        {
                          id: validateRegistryId("@pixiebrix/form"),
                          config: {
                            storage: {
                              type: "database",
                              service: {
                                __type__: "var",
                                __value__: "@pixiebrix",
                              },
                              databaseId:
                                "964c3a9b-fc42-40bf-9516-25b5d18a5000",
                            },
                            successMessage: "Successfully submitted form",
                            schema: {
                              title: "Example Form",
                              type: "object",
                              properties: {
                                notes: {
                                  title: "Example Notes Field",
                                  type: "string",
                                  description: "An example notes field",
                                },
                              },
                            },
                            uiSchema: {
                              notes: {
                                "ui:widget": "textarea",
                              },
                            },
                            recordId: {
                              __type__: "nunjucks",
                              __value__: "formData",
                            },
                          },
                          instanceId: "c419abc2-66b0-4c91-acee-9ee5b10e5000",
                        },
                      ],
                    },
                  },
                },
              ],
            },
            instanceId: "aa24a55a-2d4e-43d5-85c0-6632e0a2d000" as UUID,
          },
        ],
        heading: "Document",
      },
      extensionPoint: {
        metadata: {
          id: validateRegistryId(
            "@internal/52d42d87-4382-4c78-b00e-bbdd21d75000"
          ),
          name: "Temporary extension point",
        },
        definition: {
          type: "actionPanel",
          reader: [validateRegistryId("@pixiebrix/document-metadata")],
          isAvailable: {
            matchPatterns: ["https://pbx.vercel.app/*"],
            urlPatterns: [],
            selectors: [],
          },
          trigger: "load",
          debounce: {
            waitMillis: 250,
            leading: false,
            trailing: true,
          },
          customEvent: null,
        },
      },
    };

    const actual = selectServiceVariables(formState);
    expect(actual).toEqual(new Set(["@pixiebrix"]));
  });
});
