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

import activateBrowserActionIcon from "@/background/activateBrowserActionIcon";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { browserAction } from "@/mv3/api";
import { blobToImageData, loadImageData } from "@/utils/canvasUtils";

jest.mock("@/mv3/api", () => ({
  browserAction: {
    setIcon: jest.fn(),
  },
}));

describe("activateBrowserActionIcon", () => {
  const mock = new MockAdapter(axios);
  const url = "http://test.com/image.svg";

  const drawImageMock = jest.fn();
  const getImageDataMock = jest.fn().mockReturnValue("image data");
  const getContextmock = jest.fn().mockReturnValue({
    drawImage: drawImageMock,
    getImageData: getImageDataMock,
  });

  jest
    .mocked(browser.runtime.getManifest)
    // @ts-expect-error -- No need to mock the whole class for the test
    .mockReturnValue({ icons: "path to icons" });

  globalThis.createImageBitmap = jest.fn().mockResolvedValue("image bitmap");

  // @ts-expect-error -- No need to mock the whole class for the test
  globalThis.OffscreenCanvas = class {
    getContext = getContextmock;
  };

  beforeEach(() => {
    mock.reset();
    jest.clearAllMocks();
  });

  describe("activateBrowserActionIcon", () => {
    it("skips fetching the image data and uses the default icon when no URL is provided", async () => {
      const axiosSpy = jest.spyOn(axios, "get");
      await activateBrowserActionIcon();

      expect(axiosSpy).not.toHaveBeenCalled();
      expect(browserAction.setIcon).toHaveBeenCalledWith({
        path: "path to icons",
      });
    });

    it("fetches the image data and sets the browser action icon", async () => {
      const url = "http://test.com/image.png";
      const blob = new Blob(["test"], { type: "image/svg+xml" });

      mock.onGet(url).reply(200, blob);

      await activateBrowserActionIcon(url);

      expect(browserAction.setIcon).toHaveBeenCalledWith({
        imageData: "image data",
      });
    });

    it("uses the default icon when the request fails", async () => {
      mock.onGet(url).reply(500);

      await activateBrowserActionIcon(url);

      expect(browserAction.setIcon).toHaveBeenCalledWith({
        path: "path to icons",
      });
    });
  });

  describe("blobToImageData", () => {
    it("should return ImageData from a Blob", async () => {
      const blob = new Blob(["test"], { type: "image/svg+xml" });

      const result = await blobToImageData(blob, 32, 32);

      expect(result).toBe("image data");
      expect(getContextmock).toHaveBeenCalledWith("2d");
      expect(drawImageMock).toHaveBeenCalledWith("image bitmap", 0, 0);
      expect(getImageDataMock).toHaveBeenCalledWith(0, 0, 32, 32);
    });
  });

  describe("getImageData", () => {
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
});
