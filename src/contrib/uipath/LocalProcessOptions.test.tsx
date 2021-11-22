/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import LocalProcessOptions from "@/contrib/uipath/LocalProcessOptions";
import * as contentScriptApi from "@/contentScript/messenger/api";
import { Formik } from "formik";
import { menuItemFormStateFactory } from "@/tests/factories";
import { UIPATH_ID } from "@/contrib/uipath/localProcess";

jest.mock("@/contentScript/messenger/api");

describe("UiPath LocalProcess Options", () => {
  test("Can render options", async () => {
    (contentScriptApi.initRobot as any).mockResolvedValue({
      robotAvailable: true,
      consentCode: "abc123",
    });

    const formState = menuItemFormStateFactory({});
    formState.extension.blockPipeline = [
      {
        id: UIPATH_ID,
        config: {},
      },
    ];

    const rendered = render(
      <Formik onSubmit={jest.fn()} initialValues={formState}>
        <LocalProcessOptions name="extension.action.0" configKey="config" />
      </Formik>
    );

    expect(rendered).not.toBeNull();
  });
});
