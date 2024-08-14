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

/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "expectActions"] }] -- TODO: replace with native expect and it.each */

import useModsPageActions, {
  type ModsPageActions,
} from "@/extensionConsole/pages/mods/hooks/useModsPageActions";
import useFlags from "@/hooks/useFlags";
import {
  type ModStatus,
  type ModViewItem,
  type SharingType,
} from "@/types/modTypes";
import useModPermissions from "@/mods/hooks/useModPermissions";
import { uniq } from "lodash";
import { uuidv4 } from "@/types/helpers";
import {
  deactivateMod,
  deactivateModComponents,
} from "@/store/deactivateUtils";
import { renderHook } from "@/extensionConsole/testHelpers";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { modComponentFactory } from "@/testUtils/factories/modComponentFactories";
import { defaultModDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { authActions } from "@/auth/authSlice";
import {
  authStateFactory,
  organizationStateFactory,
} from "@/testUtils/factories/authFactories";
import { UserRole } from "@/types/contract";

jest.mock("@/hooks/useFlags");
jest.mock("@/mods/hooks/useModPermissions");

const expectActions = (
  expectedActions: string[],
  actualActions: ModsPageActions,
) => {
  // Union both set of keys to ensure all possible keys are covered
  const allActions = uniq([...Object.keys(actualActions), ...expectedActions]);
  const expected = Object.fromEntries(
    allActions.map((action) => [
      action,
      expectedActions.includes(action)
        ? expect.not.toBeNil()
        : expect.toBeNil(),
    ]),
  );
  expect(actualActions).toStrictEqual(expected);
};

const mockHooks = ({
  restricted = false,
  hasPermissions = true,
  canPublish = true,
}: {
  restricted?: boolean;
  hasPermissions?: boolean;
  canPublish?: boolean;
} = {}) => {
  jest.mocked(useFlags).mockImplementation(
    () =>
      ({
        permit: () => !restricted,
        restrict: () => restricted,
        flagOn: () => canPublish,
      }) as any,
  );

  jest.mocked(useModPermissions).mockImplementation(
    () =>
      ({
        hasPermissions,
        requestPermissions() {},
      }) as any,
  );
};

const modViewItemFactory = ({
  isModComponent,
  sharingType,
  status,
  unavailable = false,
}: {
  isModComponent: boolean;
  sharingType: SharingType;
  status: ModStatus;
  unavailable?: boolean;
}) =>
  ({
    mod: isModComponent ? modComponentFactory() : defaultModDefinitionFactory(),
    sharing: {
      source: {
        type: sharingType,
      },
    },
    status,
    unavailable,
  }) as ModViewItem;

afterEach(() => {
  jest.resetAllMocks();
});

describe("useModsPageActions", () => {
  test("active personal mod component", () => {
    mockHooks();
    const personalModComponent = modViewItemFactory({
      isModComponent: true,
      sharingType: "Personal",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useModsPageActions(personalModComponent));
    expectActions(
      ["viewPublish", "viewShare", "deactivate", "viewLogs"],
      actions,
    );
  });

  test("active personal mod", () => {
    mockHooks();
    const personalMod = modViewItemFactory({
      isModComponent: false,
      sharingType: "Personal",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useModsPageActions(personalMod));
    expectActions(
      [
        "viewPublish",
        "viewShare",
        "deactivate",
        "viewLogs",
        "editInWorkshop",
        "reactivate",
      ],
      actions,
    );
  });

  test("inactive personal mod", () => {
    mockHooks();
    const personalMod = modViewItemFactory({
      isModComponent: false,
      sharingType: "Personal",
      status: "Inactive",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useModsPageActions(personalMod));
    expectActions(
      ["viewPublish", "viewShare", "editInWorkshop", "delete", "activate"],
      actions,
    );
  });

  test("active team mod", () => {
    mockHooks();
    const teamMod = modViewItemFactory({
      isModComponent: false,
      sharingType: "Team",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useModsPageActions(teamMod));
    expectActions(
      ["viewPublish", "viewShare", "deactivate", "viewLogs", "reactivate"],
      actions,
    );
  });

  test("inactive team mod", () => {
    mockHooks();
    const teamMod = modViewItemFactory({
      isModComponent: false,
      sharingType: "Team",
      status: "Inactive",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useModsPageActions(teamMod));
    expectActions(["viewPublish", "viewShare", "activate"], actions);
  });

  test("inactive team mod with edit permissions", () => {
    mockHooks();
    const authState = authStateFactory({
      organizations: [
        organizationStateFactory({
          role: UserRole.developer,
        }),
      ],
    });

    const teamMod = modViewItemFactory({
      isModComponent: false,
      sharingType: "Team",
      status: "Inactive",
    });

    ((teamMod.mod as ModDefinition).metadata as any).id =
      authState.organizations[0].scope;

    const {
      result: { current: actions },
    } = renderHook(() => useModsPageActions(teamMod), {
      setupRedux(dispatch) {
        dispatch(authActions.setAuth(authState));
      },
    });
    expectActions(
      ["viewPublish", "viewShare", "editInWorkshop", "delete", "activate"],
      actions,
    );
  });

  test("public mod", () => {
    mockHooks();
    const publicMod = modViewItemFactory({
      isModComponent: false,
      sharingType: "Personal",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useModsPageActions(publicMod));
    expectActions(
      [
        "viewPublish",
        "viewShare",
        "reactivate",
        "viewLogs",
        "editInWorkshop",
        "deactivate",
      ],
      actions,
    );
  });

  test("team deployment for unrestricted user", () => {
    mockHooks({ restricted: false });
    const deploymentItem = modViewItemFactory({
      isModComponent: false,
      sharingType: "Deployment",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useModsPageActions(deploymentItem));
    expectActions(["reactivate", "deactivate", "viewLogs"], actions);
  });

  test("restricted team deployment", () => {
    mockHooks({ restricted: true });
    const deploymentItem = modViewItemFactory({
      isModComponent: false,
      sharingType: "Deployment",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useModsPageActions(deploymentItem));
    expectActions(["viewLogs"], actions);
  });

  test("mod with missing permissions", () => {
    mockHooks({ hasPermissions: false });
    const deploymentItem = modViewItemFactory({
      isModComponent: false,
      sharingType: "Team",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useModsPageActions(deploymentItem));
    expectActions(
      [
        "viewPublish",
        "viewShare",
        "deactivate",
        "viewLogs",
        "requestPermissions",
        "reactivate",
      ],
      actions,
    );
  });

  test("mod with access revoked", () => {
    mockHooks();
    const modItem = modViewItemFactory({
      isModComponent: false,
      sharingType: "Team",
      status: "Active",
      unavailable: true,
    });

    const {
      result: { current: actions },
    } = renderHook(() => useModsPageActions(modItem));
    expectActions(["deactivate", "viewLogs"], actions);
  });

  test("paused deployment with unrestricted user", () => {
    mockHooks({ restricted: false });
    const deploymentItem = modViewItemFactory({
      isModComponent: false,
      sharingType: "Deployment",
      status: "Paused",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useModsPageActions(deploymentItem));

    // Unrestricted users (e.g., developers) need to be able to deactivate/reactivate a deployment to use a later
    // version of the mod for development/testing.
    expectActions(["viewLogs", "deactivate", "reactivate"], actions);
  });

  test("paused deployment with restricted user", () => {
    mockHooks({ restricted: true });
    const deploymentItem = modViewItemFactory({
      isModComponent: false,
      sharingType: "Deployment",
      status: "Paused",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useModsPageActions(deploymentItem));

    expectActions(["viewLogs"], actions);
  });

  test("cannot publish without publish-to-marketplace flag", () => {
    mockHooks({ canPublish: false });
    const personalModComponent = modViewItemFactory({
      isModComponent: true,
      sharingType: "Personal",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useModsPageActions(personalModComponent));
    expectActions(["viewShare", "deactivate", "viewLogs"], actions);
  });

  describe("public mod", () => {
    let modItem: ModViewItem;
    beforeEach(() => {
      mockHooks();

      modItem = {
        mod: defaultModDefinitionFactory({
          sharing: { public: true, organizations: [] },
        }),
        sharing: {
          source: {
            type: "Personal",
          },
        },
        status: "Active",
      } as ModViewItem;
    });

    test("pending publish", () => {
      const {
        result: { current: actions },
      } = renderHook(() => useModsPageActions(modItem));
      expectActions(
        [
          "viewPublish",
          "viewShare",
          "deactivate",
          "viewLogs",
          "editInWorkshop",
          "reactivate",
        ],
        actions,
      );
    });

    test("published", () => {
      modItem.sharing.listingId = uuidv4();

      const {
        result: { current: actions },
      } = renderHook(() => useModsPageActions(modItem));
      expectActions(
        [
          "viewInMarketplaceHref",
          "viewShare",
          "deactivate",
          "viewLogs",
          "editInWorkshop",
          "reactivate",
        ],
        actions,
      );
    });
  });
});

describe("actions", () => {
  describe("deactivate", () => {
    beforeEach(() => {
      mockHooks();
    });

    test("calls deactivate for a mod", () => {
      mockHooks();
      const modViewItem = modViewItemFactory({
        isModComponent: false,
        sharingType: "Personal",
        status: "Active",
      });

      const {
        result: {
          current: { deactivate },
        },
      } = renderHook(() => useModsPageActions(modViewItem));

      deactivate();

      expect(deactivateMod).toHaveBeenCalledWith(
        (modViewItem.mod as ModDefinition).metadata.id,
        expect.any(Array),
        expect.any(Function),
      );
      expect(deactivateModComponents).not.toHaveBeenCalled();
    });
  });
});
