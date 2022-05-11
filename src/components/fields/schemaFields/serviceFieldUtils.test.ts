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
import { selectPipelines, selectVariables } from "./serviceFieldUtils";
import { Expression, ExpressionType } from "@/core";

function expr<T>(type: ExpressionType, value: T): Expression<T> {
  return {
    __type__: type,
    __value__: value,
  };
}

describe("selectPipelines", () => {
  test("handle blank", () => {
    expect(selectPipelines([])).toStrictEqual([]);
  });

  test("handle top-level pipeline", () => {
    const value = expr("pipeline", [blockConfigFactory()]);

    expect(selectPipelines([value, { foo: 42 }])).toStrictEqual([value]);
  });

  test("do not select nested pipeline", () => {
    // The caller is responsible for recursing into the pipelines

    const innerPipeline = expr("pipeline", [blockConfigFactory()]);
    const outerPipeline = expr("pipeline", [
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
              input: expr("nunjucks", "foo: {{ @foo }}"),
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
      input: expr("var", "@foo"),
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
          foo: expr("var", "@foo.bar"),
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
              onClick: expr("pipeline", [
                {
                  id: "@test/service",
                  instanceId: uuidSequence(2),
                  config: {
                    input: expr("var", "@foo"),
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
              onClick: expr("pipeline", [
                {
                  id: "@test/brick",
                  config: {
                    input: expr("var", "@foo"),
                  },
                },
                {
                  id: "@test/if",
                  config: {
                    if: expr("pipeline", [
                      {
                        id: "@test/brick",
                        config: {
                          input: expr("var", "@bar"),
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
