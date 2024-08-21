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
import { appApiMock } from "@/testUtils/appApiMock";
import { selectExtensionAuthState } from "@/auth/authUtils";
import { meApiResponseFactory } from "@/testUtils/factories/authFactories";
import { transformUserMilestoneResponse } from "@/data/model/UserMilestone";
import { type components } from "@/types/swagger";
import { transformMeResponse } from "@/data/model/Me";
import { milestoneFactory } from "@/testUtils/factories/milestoneFactories";

const renderUseMilestones = (
  milestonesApiResponses: components["schemas"]["Me"]["milestones"],
) => {
  const meResponse = meApiResponseFactory({
    milestones: milestonesApiResponses,
  });

  appApiMock.onGet("/api/me/").reply(200, meResponse);

  return renderHook(() => useMilestones(), {
    setupRedux(dispatch) {
      dispatch(
        authSlice.actions.setAuth(
          selectExtensionAuthState(transformMeResponse(meResponse)),
        ),
      );
    },
  });
};

describe("useMilestones", () => {
  beforeEach(() => {
    appApiMock.reset();
  });

  test("has milestone", () => {
    const userMilestone = milestoneFactory();

    const {
      result: {
        current: { hasMilestone },
      },
    } = renderUseMilestones([
      {
        key: userMilestone,
      },
    ]);

    expect(hasMilestone(userMilestone)).toBe(true);
    expect(hasMilestone(milestoneFactory())).toBe(false);
  });

  test("has every milestone", () => {
    const milestone1 = milestoneFactory();
    const milestone2 = milestoneFactory();

    const {
      result: {
        current: { hasEveryMilestone },
      },
    } = renderUseMilestones([
      {
        key: milestone1,
      },
      {
        key: milestone2,
      },
    ]);

    expect(hasEveryMilestone([milestone1])).toBe(true);
    expect(hasEveryMilestone([milestone1, milestone2])).toBe(true);
    expect(
      hasEveryMilestone([milestone1, milestone2, milestoneFactory()]),
    ).toBe(false);
    expect(hasEveryMilestone([])).toBe(true);
  });

  test("get milestone", () => {
    const milestone1 = milestoneFactory();
    const milestone2 = milestoneFactory();

    const test_milestone_response: NonNullable<
      components["schemas"]["Me"]["milestones"]
    >[number] = {
      key: milestone1,
      metadata: {
        value: "foo",
      },
    };
    const {
      result: {
        current: { getMilestone },
      },
    } = renderUseMilestones([
      test_milestone_response,
      {
        key: milestone2,
        metadata: {
          value: "bar",
        },
      },
    ]);

    expect(getMilestone(milestone1)).toStrictEqual(
      transformUserMilestoneResponse(test_milestone_response),
    );
    expect(getMilestone(milestoneFactory())).toBeUndefined();
  });
});
