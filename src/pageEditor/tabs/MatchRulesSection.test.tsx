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

import React from "react";
import { render } from "@/pageEditor/testHelpers";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import MatchRulesSection from "@/pageEditor/tabs/MatchRulesSection";
import { set } from "lodash";

beforeEach(() => {
  registerDefaultWidgets();
});

describe("MatchRulesSection", () => {
  test("render empty section", () => {
    expect(
      render(<MatchRulesSection isLocked={false} />, {
        initialValues: set({}, "extensionPoint.definition.isAvailable", {
          matchPatterns: [],
          urlPatterns: [],
          selectors: [],
        }),
      }).asFragment()
    ).toMatchSnapshot();
  });

  test("render populated section", () => {
    expect(
      render(<MatchRulesSection isLocked={false} />, {
        initialValues: set({}, "extensionPoint.definition.isAvailable", {
          matchPatterns: [],
          urlPatterns: [
            {
              hash: "/foo/",
            },
          ],
          selectors: ["#foo"],
        }),
      }).asFragment()
    ).toMatchSnapshot();
  });
});
