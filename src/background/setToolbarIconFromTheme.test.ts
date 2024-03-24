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

import setToolbarIconFromTheme from "@/background/setToolbarIconFromTheme";
import nock from "nock";
import { browserAction } from "@/mv3/api";

jest.mock("@/mv3/api", () => ({
  isMV3: jest.fn().mockReturnValue(false),
  browserAction: {
    setIcon: jest.fn(),
  },
}));

describe("setToolbarIconFromTheme", () => {
  const origin = "http://test.com";
  const pathname = "/image.svg";
  const url = `${origin}${pathname}`;
  const mock = nock("http://test.com");

  jest
    .mocked(browser.runtime.getManifest)
    // @ts-expect-error -- No need to mock the whole manifest for the test
    .mockReturnValue({ icons: "path to icons" });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses the default manifest icon when no toolbarIcon is defined and the theme is default", async () => {
    await setToolbarIconFromTheme({
      toolbarIcon: null,
      themeName: "default",
      logo: { small: "smallLogoPath", regular: "regularLogoPath" },
    });

    expect(browserAction.setIcon).toHaveBeenCalledWith({
      path: "path to icons",
    });
  });

  it("fetches the image data and sets the browser action icon, when toolbarIcon is defined", async () => {
    const blob = new Blob(["test"], { type: "image/svg+xml" });

    mock.get(pathname).reply(200, blob);

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
    mock.get(pathname).reply(500);

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
