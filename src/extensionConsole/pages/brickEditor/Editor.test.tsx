/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { useOpenEditorTab } from "@/extensionConsole/pages/brickEditor/Editor";
import { editablePackageMetadataFactory } from "@/testUtils/factories/registryFactories";
import { renderHook } from "@testing-library/react-hooks";
import { getExtensionConsoleUrl } from "@/utils/extensionUtils";
import { validateRegistryId } from "@/types/helpers";
import notify from "@/utils/notify";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";

const editablePackage = editablePackageMetadataFactory();
jest.mock("@/services/api", () => ({
  appApi: {
    endpoints: {
      getEditablePackages: {
        useLazyQuery: jest.fn(() => [
          jest.fn(() => {
            return {
              unwrap: jest.fn(() => [editablePackage]),
            };
          }),
        ]),
      },
    },
  },
}));
describe("Editor", () => {
  describe("useOpenEditorTab hook", () => {
    let windowOpenSpy: jest.SpyInstance;
    let notifyWarningSpy: jest.SpyInstance;

    beforeEach(() => {
      windowOpenSpy = jest.spyOn(window, "open");
      notifyWarningSpy = jest.spyOn(notify, "warning");
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("returns a function that opens the edit tab when brick is editable", async () => {
      const { result } = renderHook(() => useOpenEditorTab());
      const openEditorTab = result.current;
      await openEditorTab(editablePackage.name);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        getExtensionConsoleUrl(`workshop/bricks/${editablePackage.id}`),
      );
    });

    it("returns a function that warns and does not open the edit tab with a brick is not editable", async () => {
      const { result } = renderHook(() => useOpenEditorTab());
      const openEditorTab = result.current;
      await openEditorTab(validateRegistryId("@test/non-editable-registry-id"));
      expect(windowOpenSpy).toHaveBeenCalledTimes(0);
      expect(notifyWarningSpy).toHaveBeenCalledTimes(1);
    });
  });
});
