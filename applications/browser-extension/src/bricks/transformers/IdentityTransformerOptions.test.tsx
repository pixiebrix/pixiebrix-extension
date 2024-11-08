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
import { render } from "../../pageEditor/testHelpers";
import IdentityTransformerOptions from "./IdentityTransformerOptions";
import { getExampleBrickConfig } from "../exampleBrickConfigs";
import IdentityTransformer from "./IdentityTransformer";
import brickRegistry from "../registry";
import { screen } from "@testing-library/react";
import registerDefaultWidgets from "../../components/fields/schemaFields/widgets/registerDefaultWidgets";
import registerEditors from "../../contrib/editors";
import { toExpression } from "../../utils/expressionUtils";

beforeAll(() => {
  brickRegistry.register([new IdentityTransformer()]);
  registerDefaultWidgets();
  registerEditors();
});

describe("IdentityOptions", () => {
  test("default config matches UI header", () => {
    expect(getExampleBrickConfig(IdentityTransformer.BRICK_ID)).toEqual({
      property: toExpression("nunjucks", ""),
    });
  });

  test("shows object widget by default", async () => {
    render(<IdentityTransformerOptions name="foo" configKey="config" />, {
      initialValues: {
        foo: {
          config: getExampleBrickConfig(IdentityTransformer.BRICK_ID),
        },
      },
    });

    await expect(
      screen.findByRole("button", { name: "Add Property" }),
    ).resolves.toBeInTheDocument();
  });
});
