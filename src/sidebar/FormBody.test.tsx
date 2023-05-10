/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { render } from "@/sidebar/testHelpers";
import { formEntryFactory } from "@/testUtils/factories";
import FormBody from "@/sidebar/FormBody";
import { waitForEffect } from "@/testUtils/testHelpers";

jest.mock("@/blocks/transformers/ephemeralForm/formTransformer", () => ({
  createFrameSource: jest.fn(() => new URL("https://www.testUrl.com")),
}));

describe("FormBody", () => {
  it("renders successfully", async () => {
    const form = formEntryFactory();
    const rendered = render(<FormBody form={form} />);
    await waitForEffect();
    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
