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
import PackageDetail from "./PackageDetail";
import { TableRenderer } from "@/bricks/renderers/table";
import { waitForEffect } from "../../../../testUtils/testHelpers";
import { render } from "../../../testHelpers";
import { mockAllApiEndpoints } from "../../../../testUtils/appApiMock";

mockAllApiEndpoints();

test("renders @pixiebrix/table brick in loading state", async () => {
  const { asFragment } = render(
    <PackageDetail
      packageInstance={new TableRenderer()}
      packageConfig={null}
      isPackageConfigLoading
    />,
  );
  await waitForEffect();
  expect(asFragment()).toMatchSnapshot();
});

test("renders @pixiebrix/table loaded", async () => {
  const { asFragment } = render(
    <PackageDetail
      packageInstance={new TableRenderer()}
      packageConfig={null}
      isPackageConfigLoading={false}
    />,
  );
  await waitForEffect();
  expect(asFragment()).toMatchSnapshot();
});
