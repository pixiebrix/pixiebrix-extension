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

import React from "react";
import NonScriptablePage from "@/pageEditor/panes/NonScriptablePage";
import { render } from "@/pageEditor/testHelpers";

describe("NonScriptablePage", () => {
  it("renders", () => {
    const { asFragment } = render(<NonScriptablePage url="https://test.url" />);
    expect(asFragment()).toMatchSnapshot();
  });

  // Since 1.7.36 http: URLs are permitted
  it("renders http snapshot", () => {
    const { asFragment } = render(<NonScriptablePage url="http://test.url" />);
    expect(asFragment()).toMatchSnapshot();
  });
});
