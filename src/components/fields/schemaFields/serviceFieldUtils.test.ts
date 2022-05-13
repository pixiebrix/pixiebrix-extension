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

import {
  blockConfigFactory,
  formStateFactory,
  uuidSequence,
  baseExtensionStateFactory,
} from "@/testUtils/factories";
import { toExpression } from "@/testUtils/testHelpers";
import { selectPipelines, selectVariables } from "./serviceFieldUtils";

describe("selectPipelines", () => {
  test("handle blank", () => {
    expect(selectPipelines([])).toStrictEqual([]);
  });

  test("handle top-level pipeline", () => {
    const value = toExpression("pipeline", [blockConfigFactory()]);

    expect(selectPipelines([value, { foo: 42 }])).toStrictEqual([value]);
  });

  test("do not select nested pipeline", () => {
    // The caller is responsible for recursing into the pipelines

    const innerPipeline = toExpression("pipeline", [blockConfigFactory()]);
    const outerPipeline = toExpression("pipeline", [
      blockConfigFactory({
        config: {
          pipelineArg: innerPipeline,
        },
      }),
    ]);

    expect(selectPipelines([outerPipeline])).toStrictEqual([outerPipeline]);
  });
});

describe("selectVariables", () => {
  test("selects nothing when no services used", () => {
    const formState = formStateFactory({
      extension: baseExtensionStateFactory({
        blockPipeline: [
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
        ],
      }),
    });

    const actual = selectVariables(formState);
    expect(actual).toEqual(new Set());
  });

  test("selects top level vars", () => {
    const serviceConfig = {
      id: "@test/service",
      instanceId: uuidSequence(1),
      input: toExpression("var", "@foo"),
    };

    const formState = formStateFactory(
      undefined,
      blockConfigFactory({
        config: serviceConfig,
      })
    );

    const actual = selectVariables(formState);
    expect(actual).toEqual(new Set(["@foo"]));
  });

  test("do not select variable with path seperator", () => {
    const formState = formStateFactory(
      undefined,
      blockConfigFactory({
        config: {
          foo: toExpression("var", "@foo.bar"),
        },
      })
    );

    const actual = selectVariables(formState);
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

    const formState = formStateFactory(
      undefined,
      blockConfigFactory({
        config: documentWithButtonConfig,
      })
    );

    const actual = selectVariables(formState);
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

    const formState = formStateFactory(
      undefined,
      blockConfigFactory({
        config: documentWithButtonConfig,
      })
    );

    const actual = selectVariables(formState);
    expect(actual).toEqual(new Set(["@foo", "@bar"]));
  });
});
