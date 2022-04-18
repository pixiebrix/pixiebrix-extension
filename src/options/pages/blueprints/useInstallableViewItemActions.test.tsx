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
import { extensionFactory, recipeFactory } from "@/testUtils/factories";
import useInstallableViewItemActions, {
  InstallableViewItemActions,
} from "@/options/pages/blueprints/useInstallableViewItemActions";
import useFlags from "@/hooks/useFlags";
import {
  InstallableStatus,
  InstallableViewItem,
  SharingType,
} from "@/options/pages/blueprints/blueprintsTypes";
import useInstallablePermissions from "@/options/pages/blueprints/useInstallablePermissions";

jest.mock("@/hooks/useFlags", () => jest.fn());
jest.mock("@/options/pages/blueprints/useInstallablePermissions", () =>
  jest.fn()
);

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

const mockHooks = ({
  restricted = false,
  hasPermissions = true,
}: { restricted?: boolean; hasPermissions?: boolean } = {}) => {
  (useFlags as jest.Mock).mockImplementation(() => ({
    permit: () => !restricted,
  }));

  (useInstallablePermissions as jest.Mock).mockImplementation(() => ({
    hasPermissions,
    requestPermissions() {},
  }));
};

const installableItemFactory = ({
  isExtension = false,
  sharingType = "Personal",
  status = "Active",
}: {
  isExtension: boolean;
  sharingType: SharingType;
  status: InstallableStatus;
}) =>
  ({
    installable: isExtension ? extensionFactory() : recipeFactory(),
    sharing: {
      source: {
        type: sharingType,
      },
    },
    status,
  } as InstallableViewItem);

describe("useInstallableViewItemActions", () => {
  // eslint-disable-next-line jest/expect-expect -- assertions in expectActions helper function
  test("cloud extension", () => {
    mockHooks();
    const cloudExtensionItem = installableItemFactory({
      isExtension: true,
      sharingType: "Personal",
      status: "Inactive",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(cloudExtensionItem));
    expectActions(["activate", "deleteExtension", "exportBlueprint"], actions);
  });

  // eslint-disable-next-line jest/expect-expect -- assertions in expectActions helper function
  test("active personal extension", () => {
    mockHooks();
    const personalExtensionItem = installableItemFactory({
      isExtension: true,
      sharingType: "Personal",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(personalExtensionItem));
    expectActions(
      ["viewShare", "uninstall", "viewLogs", "exportBlueprint"],
      actions
    );
  });

  // eslint-disable-next-line jest/expect-expect -- assertions in expectActions helper function
  test("active personal blueprint", () => {
    mockHooks();
    const personalBlueprintItem = installableItemFactory({
      isExtension: false,
      sharingType: "Personal",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(personalBlueprintItem));
    expectActions(
      ["viewShare", "uninstall", "viewLogs", "exportBlueprint", "reinstall"],
      actions
    );
  });

  // eslint-disable-next-line jest/expect-expect -- assertions in expectActions helper function
  test("inactive personal blueprint", () => {
    mockHooks();
    const personalBlueprintItem = installableItemFactory({
      isExtension: false,
      sharingType: "Personal",
      status: "Inactive",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(personalBlueprintItem));
    expectActions(["activate", "viewShare", "exportBlueprint"], actions);
  });

  // eslint-disable-next-line jest/expect-expect -- assertions in expectActions helper function
  test("active team blueprint", () => {
    mockHooks();
    const teamBlueprintItem = installableItemFactory({
      isExtension: false,
      sharingType: "Team",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(teamBlueprintItem));
    expectActions(
      ["viewShare", "uninstall", "viewLogs", "exportBlueprint", "reinstall"],
      actions
    );
  });

  // eslint-disable-next-line jest/expect-expect -- assertions in expectActions helper function
  test("inactive team blueprint", () => {
    mockHooks();
    const teamBlueprintItem = installableItemFactory({
      isExtension: false,
      sharingType: "Team",
      status: "Inactive",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(teamBlueprintItem));
    expectActions(["activate", "viewShare", "exportBlueprint"], actions);
  });

  // eslint-disable-next-line jest/expect-expect -- assertions in expectActions helper function
  test("public blueprint", () => {
    mockHooks();
    const publicBlueprintItem = installableItemFactory({
      isExtension: false,
      sharingType: "Personal",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(publicBlueprintItem));
    expectActions(
      ["reinstall", "viewShare", "exportBlueprint", "viewLogs", "uninstall"],
      actions
    );
  });

  // eslint-disable-next-line jest/expect-expect -- assertions in expectActions helper function
  test("team deployment", () => {
    mockHooks();
    const deploymentItem = installableItemFactory({
      isExtension: false,
      sharingType: "Deployment",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(deploymentItem));
    expectActions(
      ["viewShare", "uninstall", "viewLogs", "exportBlueprint"],
      actions
    );
  });

  // eslint-disable-next-line jest/expect-expect -- assertions in expectActions helper function
  test("restricted team deployment", () => {
    mockHooks({ restricted: true });
    const deploymentItem = installableItemFactory({
      isExtension: false,
      sharingType: "Deployment",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(deploymentItem));
    expectActions(["viewShare", "viewLogs", "exportBlueprint"], actions);
  });

  // eslint-disable-next-line jest/expect-expect -- assertions in expectActions helper function
  test("blueprint with missing permissions", () => {
    mockHooks({ hasPermissions: false });
    const deploymentItem = installableItemFactory({
      isExtension: false,
      sharingType: "Team",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(deploymentItem));
    expectActions(
      [
        "viewShare",
        "uninstall",
        "viewLogs",
        "requestPermissions",
        "exportBlueprint",
        "reinstall",
      ],
      actions
    );
  });
});
