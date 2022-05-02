/* eslint-disable jest/expect-expect -- assertions in expectActions helper function */
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

// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- test file
/// <reference types="jest-extended" />

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
import { uniq } from "lodash";

jest.mock("@/hooks/useFlags", () => jest.fn());
jest.mock("@/options/pages/blueprints/useInstallablePermissions", () =>
  jest.fn()
);

const expectActions = (
  expectedActions: string[],
  actualActions: InstallableViewItemActions
) => {
  // Union both set of keys to ensure all possible keys are covered
  const allActions = uniq([...Object.keys(actualActions), ...expectedActions]);
  const expected = Object.fromEntries(
    allActions.map((action) => [
      action,
      expectedActions.includes(action)
        ? expect.toBeFunction()
        : expect.toBeNil(),
    ])
  );
  expect(actualActions).toStrictEqual(expected);
};

const mockHooks = ({
  restricted = false,
  hasPermissions = true,
}: { restricted?: boolean; hasPermissions?: boolean } = {}) => {
  (useFlags as jest.Mock).mockImplementation(() => ({
    permit: () => !restricted,
    restrict: () => restricted,
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

  test("team deployment for unrestricted user", () => {
    mockHooks({ restricted: false });
    const deploymentItem = installableItemFactory({
      isExtension: false,
      sharingType: "Deployment",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(deploymentItem));
    expectActions(["reinstall", "uninstall", "viewLogs"], actions);
  });

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
    expectActions(["viewLogs"], actions);
  });

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

  test("paused deployment with unrestricted user", () => {
    mockHooks({ restricted: false });
    const deploymentItem = installableItemFactory({
      isExtension: false,
      sharingType: "Deployment",
      status: "Paused",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(deploymentItem));

    // Unrestricted users (e.g., developers) need to be able to uninstall/reactivate a deployment to use a later
    // version of the blueprint for development/testing.
    expectActions(["viewLogs", "uninstall", "reinstall"], actions);
  });

  test("paused deployment with restricted user", () => {
    mockHooks({ restricted: true });
    const deploymentItem = installableItemFactory({
      isExtension: false,
      sharingType: "Deployment",
      status: "Paused",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(deploymentItem));

    expectActions(["viewLogs"], actions);
  });
});
