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
import PaginatedTable from "@/components/paginatedTable/PaginatedTable";
import { Column } from "react-table";
import { MemoryRouter } from "react-router";
import { waitForEffect } from "@/testUtils/testHelpers";

describe("initialRecord", () => {
  it("renders empty table", () => {
    const columns: Array<Column<{ id: number }>> = [
      {
        accessor: "id",
      },
    ];

    const component = render(
      <MemoryRouter>
        <PaginatedTable data={[]} columns={columns} showSearchFilter />
      </MemoryRouter>
    );

    expect(component.container.querySelector("table")).not.toBeNull();
  });

  it("shows page with initialRecord", async () => {
    const data = [{ id: 1 }, { id: 2 }, { id: 3 }];

    const columns: Array<Column<{ id: number }>> = [
      {
        accessor: "id",
      },
    ];

    const component = render(
      <MemoryRouter>
        <PaginatedTable
          initialPageSize={1}
          data={data}
          columns={columns}
          initialRecord={data[1]}
          showSearchFilter={false}
        />
      </MemoryRouter>
    );

    await waitForEffect();

    expect(component.container.querySelector("td").textContent).toStrictEqual(
      "2"
    );
  });
});
