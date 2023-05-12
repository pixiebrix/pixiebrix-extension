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

import useMilestones from "@/hooks/useMilestones";
import { renderHook } from "@/testUtils/renderWithCommonStore";
import { authSlice } from "@/auth/authSlice";
import { type AuthState } from "@/auth/authTypes";
import { appApiMock } from "@/testUtils/appApiMock";
import { userFactory } from "@/testUtils/factories";
import { selectExtensionAuthState } from "@/auth/authUtils";

const renderUseMilestones = (milestones: AuthState["milestones"]) => {
  const user = userFactory({
    milestones,
  });

  appApiMock.onGet("/api/me/").reply(200, user);

  return renderHook(() => useMilestones(), {
    setupRedux(dispatch) {
      dispatch(authSlice.actions.setAuth(selectExtensionAuthState(user)));
    },
  });
};

describe("useMilestones", () => {
  beforeEach(() => {
    appApiMock.reset();
  });

  test("has milestone", () => {
    const {
      result: {
        current: { hasMilestone },
      },
    } = renderUseMilestones([
      {
        key: "test_milestone",
      },
    ]);

    expect(hasMilestone("test_milestone")).toBe(true);
    expect(hasMilestone("does_not_exist")).toBe(false);
  });

  test("has every milestone", () => {
    const {
      result: {
        current: { hasEveryMilestone },
      },
    } = renderUseMilestones([
      {
        key: "test_milestone_1",
      },
      {
        key: "test_milestone_2",
      },
    ]);

    expect(hasEveryMilestone(["test_milestone_1"])).toBe(true);
    expect(hasEveryMilestone(["test_milestone_1", "test_milestone_2"])).toBe(
      true
    );
    expect(
      hasEveryMilestone([
        "test_milestone_1",
        "test_milestone_2",
        "does_not_exist",
      ])
    ).toBe(false);
    expect(hasEveryMilestone([])).toBe(true);
  });

  test("get milestone", () => {
    const test_milestone = {
      key: "test_milestone_1",
      value: "foo",
    };
    const {
      result: {
        current: { getMilestone },
      },
    } = renderUseMilestones([
      test_milestone,
      {
        key: "test_milestone_2",
        value: "bar",
      },
    ]);

    expect(getMilestone("test_milestone_1")).toBe(test_milestone);
    expect(getMilestone("does_not_exist")).toBe(undefined);
  });
});
