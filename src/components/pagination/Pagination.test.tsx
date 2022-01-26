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
import { render } from "@testing-library/react";
import Pagination, { MAX_DISPLAYED_PAGES } from "./Pagination";

test(`renders ${MAX_DISPLAYED_PAGES} pages`, () => {
  const rendered = render(
    <Pagination page={1} numPages={MAX_DISPLAYED_PAGES} setPage={jest.fn()} />
  );
  expect(rendered.asFragment()).toMatchSnapshot();
});

test.each([
  1,
  2,
  MAX_DISPLAYED_PAGES + 1,
  Math.floor(1.5 * MAX_DISPLAYED_PAGES) + 1,
  2 * MAX_DISPLAYED_PAGES + 1,
  3 * MAX_DISPLAYED_PAGES - 1,
  3 * MAX_DISPLAYED_PAGES,
])(
  `renders ${3 * MAX_DISPLAYED_PAGES} pages with %s being current`,
  (currentPage: number) => {
    const rendered = render(
      <Pagination
        page={currentPage - 1}
        numPages={3 * MAX_DISPLAYED_PAGES}
        setPage={jest.fn()}
      />
    );
    expect(rendered.asFragment()).toMatchSnapshot();
  }
);
