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

import { truncateBreadcrumbLabelsInPlace } from "@/pageEditor/tabs/editTab/dataPanel/tabs/FindTab/breadcrumbLabelHelpers";
import { cloneDeep, repeat } from "lodash";

describe("truncateBreadcrumbLabelsInPlace", () => {
  it("truncates label", () => {
    const matches = [
      { breadcrumbLabels: [repeat("a", 15)] },
      { breadcrumbLabels: [repeat("a", 15)] },
    ];

    truncateBreadcrumbLabelsInPlace(matches);

    expect(matches).toStrictEqual([
      { breadcrumbLabels: ["aaaaa...aaaaa"] },
      { breadcrumbLabels: ["aaaaa...aaaaa"] },
    ]);
  });

  it("ensures unique label", () => {
    // Degenerate case is the difference is in the middle of the string so picking up additional length
    // can't solve the difference
    const matches = [
      { breadcrumbLabels: ["aaaaaa1zzzzzz1aaaaaa"] },
      { breadcrumbLabels: ["aaaaaa2zzzzzz2aaaaaa"] },
    ];

    truncateBreadcrumbLabelsInPlace(matches);

    expect(matches).toStrictEqual([
      { breadcrumbLabels: ["aaaaaa1...1aaaaaa"] },
      { breadcrumbLabels: ["aaaaaa2...2aaaaaa"] },
    ]);
  });

  it("returns full label in degenerate case", () => {
    // Degenerate case occurs when the difference is in the middle of the string.
    // Picking up additional surrounding context can't differentiate the values
    const matches = [
      { breadcrumbLabels: [repeat("a", 8) + "1" + repeat("a", 8)] },
      { breadcrumbLabels: [repeat("a", 8) + "2" + repeat("a", 8)] },
    ];

    // Clone because method modifies the input in place
    const target = cloneDeep(matches);

    truncateBreadcrumbLabelsInPlace(matches);

    expect(matches).toStrictEqual(target);
  });
});
