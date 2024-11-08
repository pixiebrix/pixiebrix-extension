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

import { blobToImageData, loadImageData } from "./canvasUtils";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";

const mock = new MockAdapter(axios);
const url = "http://test.com/image.svg";

jest
  .mocked(browser.runtime.getManifest)
  // @ts-expect-error -- No need to mock the whole manifest for the test
  .mockReturnValue({ icons: "path to icons" });

describe("blobToImageData", () => {
  it("should return ImageData from a Blob", async () => {
    const blob = new Blob(["test"], { type: "image/svg+xml" });

    const result = await blobToImageData(blob, 32, 32);

    expect(result).toBe("image data");

    expect(OffscreenCanvas.prototype.getContext).toHaveBeenCalledWith("2d");
    expect(CanvasRenderingContext2D.prototype.drawImage).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 32,
        height: 32,
        close: expect.any(Function),
      }),
      0,
      0,
      32,
      32,
    );
    expect(
      CanvasRenderingContext2D.prototype.getImageData,
    ).toHaveBeenCalledWith(0, 0, 32, 32);
  });
});

describe("loadImageData", () => {
  it("should return ImageData when the request is successful", async () => {
    const blob = new Blob(["test"], { type: "image/svg+xml" });
    mock.onGet(url).reply(200, blob);

    const result = await loadImageData(url, 32, 32);

    expect(result).toBe("image data");
  });

  it("should throw when the request fails", async () => {
    mock.onGet(url).reply(500);

    await expect(loadImageData(url, 32, 32)).rejects.toThrow(
      "Request failed with status code 500",
    );
  });
});
