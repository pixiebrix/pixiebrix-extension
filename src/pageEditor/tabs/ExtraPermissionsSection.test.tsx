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
import { set } from "lodash";
import ExtraPermissionsSection from "./ExtraPermissionsSection";

beforeEach(() => {
  registerDefaultWidgets();
});

describe("ExtraPermissionsSection", () => {
  test("render empty section", () => {
    expect(
      render(<ExtraPermissionsSection />, {
        initialValues: set({}, "permissions", {
          origins: [],
          permissions: [],
        }),
      }).asFragment()
    ).toMatchSnapshot();
  });

  test("render populated section", () => {
    expect(
      render(<ExtraPermissionsSection />, {
        initialValues: set({}, "permissions", {
          origins: [
            "http://web.archive.org/web/20150905193945/http://www.hamsterdance.com/",
          ],
          permissions: [],
        }),
      }).asFragment()
    ).toMatchSnapshot();
  });
});
