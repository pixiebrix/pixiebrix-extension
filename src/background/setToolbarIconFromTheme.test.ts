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

import setToolbarIconFromTheme, {
  blobToImageData,
  getImageData,
} from "@/background/setToolbarIconFromTheme";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { browserAction } from "@/mv3/api";

jest.mock("@/mv3/api", () => ({
  isMV3: jest.fn().mockReturnValue(false),
  browserAction: {
    setIcon: jest.fn(),
  },
}));

describe("setToolbarIconFromTheme", () => {
  const mock = new MockAdapter(axios);
  const url = "http://test.com/image.svg";

  const drawImageMock = jest.fn();
  const getImageDataMock = jest.fn().mockReturnValue("image data");
  const getContextMock = jest.fn().mockReturnValue({
    drawImage: drawImageMock,
    getImageData: getImageDataMock,
  });

  // @ts-expect-error -- No need to mock the whole class for the test
  global.browser = {
    runtime: {
      getManifest: () => ({ icons: "path to icons" }),
    },
  };

  // @ts-expect-error -- No need to mock the whole class for the test
  global.Image = class {
    src = "";
    decode = jest.fn();
  };
  // @ts-expect-error -- No need to mock the whole class for the test
  global.OffscreenCanvas = class {
    getContext = getContextMock;
  };

  URL.createObjectURL = jest.fn();

  beforeEach(() => {
    mock.reset();
    jest.clearAllMocks();
  });

  describe("setToolbarIconFromTheme", () => {
    it("uses the default manifest icon when no toolbarIcon is defined and the theme is default", async () => {
      const axiosSpy = jest.spyOn(axios, "get");
      await setToolbarIconFromTheme({
        toolbarIcon: null,
        themeName: "default",
        logo: { small: "smallLogoPath", regular: "regularLogoPath" },
      });

      expect(axiosSpy).not.toHaveBeenCalled();
      expect(browserAction.setIcon).toHaveBeenCalledWith({
        path: "path to icons",
      });
    });

    it("fetches the image data and sets the browser action icon, when toolbarIcon is defined", async () => {
      const url = "http://test.com/image.png";
      const blob = new Blob(["test"], { type: "image/svg+xml" });

      mock.onGet(url).reply(200, blob);

      await setToolbarIconFromTheme({
        toolbarIcon: url,
        themeName: "default",
        logo: { small: "smallLogoPath", regular: "regularLogoPath" },
      });

      expect(browserAction.setIcon).toHaveBeenCalledWith({
        imageData: "image data",
      });
    });

    it("uses the default icon when the request fails", async () => {
      mock.onGet(url).reply(500);

      await setToolbarIconFromTheme({
        toolbarIcon: url,
        themeName: "default",
        logo: { small: "smallLogoPath", regular: "regularLogoPath" },
      });

      expect(browserAction.setIcon).toHaveBeenCalledWith({
        path: "path to icons",
      });
    });

    it("uses the small logo image if toolbar is not defined, and theme is not default", async () => {
      await setToolbarIconFromTheme({
        toolbarIcon: null,
        themeName: "automation-anywhere",
        logo: { small: "smallLogoPath", regular: "regularLogoPath" },
      });

      expect(browserAction.setIcon).toHaveBeenCalledWith({
        path: "smallLogoPath",
      });
    });
  });

  describe("blobToImageData", () => {
    it("should return ImageData from a Blob", async () => {
      const blob = new Blob(["test"], { type: "image/svg+xml" });

      const result = await blobToImageData(blob);

      expect(result).toBe("image data");
      expect(getContextMock).toHaveBeenCalledWith("2d");
      expect(drawImageMock).toHaveBeenCalledWith(
        expect.any(Image),
        0,
        0,
        16,
        16,
      );
      expect(getImageDataMock).toHaveBeenCalledWith(0, 0, 16, 16);
    });
  });

  describe("getImageData", () => {
    it("should return ImageData when the request is successful", async () => {
      const blob = new Blob(["test"], { type: "image/svg+xml" });
      mock.onGet(url).reply(200, blob);

      const result = await getImageData(url);

      expect(result).toBe("image data");
    });

    it("should return null when the request fails", async () => {
      mock.onGet(url).reply(500);

      const result = await getImageData(url);

      expect(result).toBeNull();
    });
  });
});
