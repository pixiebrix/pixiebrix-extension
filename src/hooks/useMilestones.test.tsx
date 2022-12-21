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

import { configureStore } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import { authSlice, persistAuthConfig } from "@/auth/authSlice";
import useMilestones from "@/hooks/useMilestones";
import { renderHook } from "@testing-library/react-hooks";
import { Provider } from "react-redux";
import React from "react";

function optionsStore(initialState?: any) {
  return configureStore({
    reducer: {
      auth: persistReducer(persistAuthConfig, authSlice.reducer),
    },
    preloadedState: initialState,
  });
}

const renderUseMilestones = (initialState?: any) => {
  return renderHook(() => useMilestones(), {
    wrapper: ({ children }) => (
      <Provider store={optionsStore(initialState)}>{children}</Provider>
    ),
  });
};

describe("useMilestones", () => {
  test("has milestone", () => {
    const {
      result: {
        current: { hasMilestone },
      },
    } = renderUseMilestones({
      auth: {
        milestones: [
          {
            key: "test_milestone",
          },
        ],
      },
    });

    expect(hasMilestone("test_milestone")).toBe(true);
    expect(hasMilestone("does_not_exist")).toBe(false);
  });

  test("has every milestone", () => {
    const {
      result: {
        current: { hasEveryMilestone },
      },
    } = renderUseMilestones({
      auth: {
        milestones: [
          {
            key: "test_milestone_1",
          },
          {
            key: "test_milestone_2",
          },
        ],
      },
    });

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
    } = renderUseMilestones({
      auth: {
        milestones: [
          test_milestone,
          {
            key: "test_milestone_2",
            value: "bar",
          },
        ],
      },
    });

    expect(getMilestone("test_milestone_1")).toBe(test_milestone);
    expect(getMilestone("does_not_exist")).toBe(undefined);
  });
});
