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
  blobToImageData,
  loadImageData,
  snapWithin,
} from "@/utils/canvasUtils";
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
      expect.any(HTMLImageElement),
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

describe("snapWithin", () => {
  const outerBox = { x: 0, y: 0, width: 100, height: 100 };

  it.each([
    [
      "fully within",
      { x: 10, y: 10, width: 20, height: 20 },
      {
        x: 10,
        y: 10,
        width: 20,
        height: 20,
        top: 10,
        left: 10,
        bottom: 30,
        right: 30,
      },
    ],
    [
      "partially outside from top",
      { x: 10, y: -10, width: 20, height: 20 },
      {
        x: 10,
        y: 0,
        width: 20,
        height: 10,
        top: 0,
        left: 10,
        bottom: 10,
        right: 30,
      },
    ],
    [
      "partially outside from bottom",
      { x: 10, y: 90, width: 20, height: 20 },
      {
        x: 10,
        y: 90,
        width: 20,
        height: 10,
        top: 90,
        left: 10,
        bottom: 100,
        right: 30,
      },
    ],
    [
      "partially outside from left",
      { x: -10, y: 10, width: 20, height: 20 },
      {
        x: 0,
        y: 10,
        width: 10,
        height: 20,
        top: 10,
        left: 0,
        bottom: 30,
        right: 10,
      },
    ],
    [
      "partially outside from right",
      { x: 90, y: 10, width: 20, height: 20 },
      {
        x: 90,
        y: 10,
        width: 10,
        height: 20,
        top: 10,
        left: 90,
        bottom: 30,
        right: 100,
      },
    ],
    [
      "fully outside with overlapping edge",
      { x: 0, y: 120, width: 20, height: 20 },
      {
        x: 0,
        y: 100,
        width: 20,
        height: 0,
        top: 100,
        left: 0,
        bottom: 100,
        right: 20,
      },
    ],
    [
      "fully outside with no overlapping edge",
      { x: 120, y: 120, width: 20, height: 20 },
      {
        x: 100,
        y: 100,
        width: 0,
        height: 0,
        top: 100,
        left: 100,
        bottom: 100,
        right: 100,
      },
    ],
  ])("%s", (_, innerBox, expected) => {
    const result = snapWithin(innerBox, outerBox);
    expect(result).toEqual(expected);
  });
});
