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

import { useOpenEditorTab } from "@/extensionConsole/pages/packageEditor/Editor";
import { editablePackageMetadataFactory } from "@/testUtils/factories/registryFactories";
import { getExtensionConsoleUrl } from "@/utils/extensionUtils";
import { validateRegistryId } from "@/types/helpers";
import notify from "@/utils/notify";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { renderHook } from "@/extensionConsole/testHelpers";
import { API_PATHS } from "@/data/service/urlPaths";

const axiosMock = new MockAdapter(axios);

describe("Editor", () => {
  describe("useOpenEditorTab hook", () => {
    let windowOpenSpy: jest.SpyInstance;
    let notifyWarningSpy: jest.SpyInstance;
    let notifyErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      windowOpenSpy = jest.spyOn(window, "open");
      notifyWarningSpy = jest.spyOn(notify, "warning");
      notifyErrorSpy = jest.spyOn(notify, "error");
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("opens the edit tab when brick is editable", async () => {
      const editablePackage = editablePackageMetadataFactory();
      axiosMock.onGet(API_PATHS.BRICKS).reply(200, [editablePackage]);

      const { result } = renderHook(() => useOpenEditorTab());
      const openEditorTab = result.current;
      await openEditorTab(editablePackage.name);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        getExtensionConsoleUrl(`workshop/bricks/${editablePackage.id}`),
      );
    });

    it("warns and does not open the edit tab with a brick is not editable", async () => {
      axiosMock.onGet(API_PATHS.BRICKS).reply(200, []);

      const { result } = renderHook(() => useOpenEditorTab());
      const openEditorTab = result.current;
      await openEditorTab(validateRegistryId("@test/non-editable-registry-id"));
      expect(windowOpenSpy).toHaveBeenCalledTimes(0);
      expect(notifyWarningSpy).toHaveBeenCalledTimes(1);
    });

    it("displays error when request error", async () => {
      axiosMock.onGet(API_PATHS.BRICKS).reply(500);

      const { result } = renderHook(() => useOpenEditorTab());
      const openEditorTab = result.current;
      await openEditorTab(validateRegistryId("@test/non-editable-registry-id"));
      expect(windowOpenSpy).toHaveBeenCalledTimes(0);
      expect(notifyErrorSpy).toHaveBeenCalledTimes(1);
      expect(notifyWarningSpy).toHaveBeenCalledTimes(0);
    });
  });
});
