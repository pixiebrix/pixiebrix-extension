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

import { FormTransformer } from "./formTransformer";
import { toExpression } from "../../../utils/expressionUtils";
import { unsafeAssumeValidArg } from "../../../runtime/runtimeTypes";
import { brickOptionsFactory } from "../../../testUtils/factories/runtimeFactories";
import { isLoadedInIframe } from "../../../utils/iframeUtils";
import { BusinessError, CancelError } from "@/errors/businessErrors";
import { cancelAll } from "../../../platform/forms/formController";
import * as messenger from "webext-messenger";
import { showModal } from "@/contentScript/modalDom";

jest.mock("../../../utils/iframeUtils");
jest.mock("../../../contentScript/modalDom");

const showModalMock = jest.mocked(showModal);

const brick = new FormTransformer();

afterEach(async () => {
  await cancelAll();
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
    // Exposed via __mocks__/webext-messenger
    (messenger as any).setFrameId(0);
    jest.mocked(isLoadedInIframe).mockReturnValue(false);

    const brickPromise = brick.run(
      unsafeAssumeValidArg({
        location: "modal",
        schema: {
          tile: "Hello, World",
        },
      }),
      brickOptionsFactory(),
    );

    await cancelAll();

    await expect(brickPromise).rejects.toThrow(CancelError);

    expect(showModalMock).toHaveBeenCalledExactlyOnceWith({
      controller: expect.any(AbortController),
      // Why is any(String) now working here?
      url: expect.anything(),
    });

    const opener = new URL(
      showModalMock.mock.calls[0]![0].url,
    ).searchParams.get("opener");
    expect(JSON.parse(opener!)).toStrictEqual({ tabId: 1, frameId: 0 });
  });

  it("shows modal in sub-frame", async () => {
    // Exposed via __mocks__/webext-messenger
    (messenger as any).setFrameId(1);
    jest.mocked(isLoadedInIframe).mockReturnValue(true);

    const brickPromise = brick.run(
      unsafeAssumeValidArg({
        location: "modal",
        schema: {
          tile: "Hello, World",
        },
      }),
      brickOptionsFactory(),
    );

    await cancelAll();

    await expect(brickPromise).rejects.toThrow(CancelError);

    expect(showModalMock).toHaveBeenCalledExactlyOnceWith({
      controller: expect.any(AbortController),
      // Why is any(String) not working here?
      url: expect.anything(),
    });

    const opener = new URL(
      showModalMock.mock.calls[0]![0].url,
    ).searchParams.get("opener");

    expect(JSON.parse(opener!)).toStrictEqual({ tabId: 1, frameId: 1 });
  });

  it("cancels form if form already showing", async () => {
    // Exposed via __mocks__/webext-messenger
    (messenger as any).setFrameId(0);
    jest.mocked(isLoadedInIframe).mockReturnValue(false);

    // Use same options so they have the same extensionId
    const options = brickOptionsFactory();

    const firstPromise = brick.run(
      unsafeAssumeValidArg({
        location: "modal",
        schema: {
          tile: "Hello, World",
        },
      }),
      options,
    );

    const secondPromise = brick.run(
      unsafeAssumeValidArg({
        location: "modal",
        schema: {
          tile: "Hello, Again",
        },
      }),
      options,
    );

    await expect(firstPromise).rejects.toThrow(CancelError);

    await cancelAll();

    await expect(secondPromise).rejects.toThrow(CancelError);
  });
});
