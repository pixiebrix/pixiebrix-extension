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

import { renderHook } from "@testing-library/react-hooks";
import { extensionFactory } from "@/testUtils/factories";
import useInstallableViewItemActions, {
  InstallableViewItemActions,
} from "@/options/pages/blueprints/useInstallableViewItemActions";

const expectActions = (
  expectedActions: string[],
  actualActions: InstallableViewItemActions
) => {
  for (const [action, fn] of Object.entries(actualActions)) {
    if (expectedActions.includes(action)) {
      expect(fn).not.toBeNull();
    } else {
      expect(fn).toBeNull();
    }
  }
};

describe("useInstallableViewItemActions", () => {
  test("cloud extension", () => {
    const cloudExtensionItem = {
      installable: extensionFactory(),
      sharing: {
        source: {
          type: "Personal",
        },
      },
      status: "Inactive",
    };

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(cloudExtensionItem));
    expectActions(["activate", "deleteExtension", "exportBlueprint"], actions);
  });

  test("active personal extension", () => {
    const personalExtensionItem = {
      installable: extensionFactory(),
      sharing: {
        source: {
          type: "Personal",
        },
      },
      status: "Active",
    };

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(personalExtensionItem));
    expectActions(
      ["viewShare", "uninstall", "viewLogs", "exportBlueprint"],
      actions
    );
  });
});
