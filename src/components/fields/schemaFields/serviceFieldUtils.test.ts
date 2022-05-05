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
import { selectVars } from "./serviceFieldUtils";

describe("select service vars from pipeline", () => {
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
              input: {
                __type__: "nunjucks",
                __value__: "foo: {{ @foo }}",
              },
            },
          }),
        ],
      }),
    });

    const actual = selectVars(formState);
    expect(actual).toEqual(new Set());
  });

  test("selects top level vars", () => {
    const serviceConfig = {
      id: "@test/service",
      instanceId: uuidSequence(1),
      input: {
        __type__: "var",
        __value__: "@foo",
      },
      outputKey: "transformed",
    };

    const formState = formStateFactory(
      undefined,
      blockConfigFactory({
        config: serviceConfig,
      })
    );

    const actual = selectVars(formState);
    expect(actual).toEqual(new Set(["@foo"]));
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
              onClick: {
                __type__: "pipeline",
                __value__: [
                  {
                    id: "@test/service",
                    instanceId: uuidSequence(2),
                    config: {
                      input: {
                        __type__: "var",
                        __value__: "@foo",
                      },
                    },
                  },
                ],
              },
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

    const actual = selectVars(formState);
    expect(actual).toEqual(new Set(["@foo"]));
  });
});
