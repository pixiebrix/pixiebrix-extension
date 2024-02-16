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

import { FormTransformer } from "@/bricks/transformers/ephemeralForm/formTransformer";

import { toExpression } from "@/utils/expressionUtils";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";
import { isLoadedInIframe } from "@/utils/iframeUtils";
import { BusinessError, CancelError } from "@/errors/businessErrors";
import { showModal } from "@/bricks/transformers/ephemeralForm/modalUtils";
import { TEST_cancelAll } from "@/contentScript/ephemeralFormProtocol";

jest.mock("@/utils/iframeUtils");
jest.mock("@/bricks/transformers/ephemeralForm/modalUtils");
const showModalMock = jest.mocked(showModal);

const brick = new FormTransformer();

afterEach(async () => {
  // eslint-disable-next-line new-cap -- test method
  await TEST_cancelAll();
  jest.clearAllMocks();
});

describe("FormTransformer", () => {
  it("returns form schema for output schema", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
      },
    };

    const outputSchema = brick.getOutputSchema({
      id: brick.id,
      config: {
        schema,
      },
    });

    expect(outputSchema).toEqual(schema);
  });

  it("return default schema for top-level variable", () => {
    const outputSchema = brick.getOutputSchema({
      id: brick.id,
      config: {
        schema: toExpression("var", "@test"),
      },
    });

    expect(outputSchema).toEqual(brick.outputSchema);
  });

  it("throws BusinessError if targeting sidebar from frame", async () => {
    jest.mocked(isLoadedInIframe).mockReturnValue(true);

    await expect(
      brick.run(
        unsafeAssumeValidArg({
          location: "sidebar",
          schema: {
            tile: "Hello, World",
          },
        }),
        brickOptionsFactory(),
      ),
    ).rejects.toThrow(BusinessError);

    expect(showModalMock).not.toHaveBeenCalled();
  });

  it("shows modal in top-level", async () => {
    jest.mocked(isLoadedInIframe).mockReturnValue(false);
    showModalMock.mockReturnValue(null);

    const brickPromise = brick.run(
      unsafeAssumeValidArg({
        location: "modal",
        schema: {
          tile: "Hello, World",
        },
      }),
      brickOptionsFactory(),
    );

    // eslint-disable-next-line new-cap -- test method
    await TEST_cancelAll();

    await expect(brickPromise).rejects.toThrow(CancelError);

    expect(showModalMock).toHaveBeenCalledExactlyOnceWith({
      controller: expect.any(AbortController),
      // Why is any(String) now working here?
      url: expect.anything(),
    });
  });
});
