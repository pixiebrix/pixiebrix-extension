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
import BrickDetail from "./BrickDetail";
import { TableRenderer } from "@/blocks/renderers/table";
import { ReferenceEntry } from "@/options/pages/brickEditor/brickEditorTypes";
import { MarketplaceListing } from "@/types/contract";
import { waitForEffect } from "@/utils/testUtils/testHelpers";

jest.mock("@/services/api", () => ({
  useGetMarketplaceListingsQuery: () => ({ data: [] as MarketplaceListing[] }),
}));

test.each([
  ["empty", {}],
  ["@pixiebrix/table", new TableRenderer()],
])(
  "renders %s brick in loading state",
  async (brickName: string, brick: ReferenceEntry) => {
    const rendered = render(
      <BrickDetail brick={brick} brickConfig={null} isBrickConfigLoading />
    );
    await waitForEffect();
    expect(rendered.asFragment()).toMatchSnapshot();
  }
);

test("renders @pixiebrix/table loaded", async () => {
  const rendered = render(
    <BrickDetail
      brick={new TableRenderer()}
      brickConfig={null}
      isBrickConfigLoading={false}
    />
  );
  await waitForEffect();
  expect(rendered.asFragment()).toMatchSnapshot();
});
