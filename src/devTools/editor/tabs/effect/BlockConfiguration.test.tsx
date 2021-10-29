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

import { createFormikTemplate } from "@/tests/formHelpers";
import { validateRegistryId } from "@/types/helpers";
import { render, screen } from "@testing-library/react";
import React from "react";
import BlockConfiguration, {
  DEFAULT_TEMPLATE_ENGINE_VALUE,
  DEFAULT_WINDOW_VALUE,
} from "./BlockConfiguration";
import styles from "./BlockConfiguration.module.scss";

const BLOCK_FIELD_NAME = "block";
const BLOCK_ID = validateRegistryId("tests/block");

describe("Advanced options", () => {
  test.each([
    {},
    {
      templateEngine: DEFAULT_TEMPLATE_ENGINE_VALUE,
    },
    {
      window: DEFAULT_WINDOW_VALUE,
    },
  ])("doesn't show advanced links by default", (blockConfig) => {
    const FormikTemplate = createFormikTemplate({
      [BLOCK_FIELD_NAME]: blockConfig,
    });

    const { container } = render(
      <FormikTemplate>
        <BlockConfiguration name={BLOCK_FIELD_NAME} blockId={BLOCK_ID} />
      </FormikTemplate>
    );

    const advancedLinksContainer = container.querySelector(
      `.${styles.advancedLinks}`
    );

    expect(advancedLinksContainer).toBeNull();
  });

  test.each([
    [
      {
        templateEngine: "nunjucks",
      },
      "Template Engine: nunjucks",
    ],
    [
      {
        if: "true",
      },
      "Condition: true",
    ],
    [
      {
        window: "target",
      },
      "Target: target",
    ],
  ])("shows changed advanced options", (blockConfig, expectedOptionText) => {
    const FormikTemplate = createFormikTemplate({
      [BLOCK_FIELD_NAME]: blockConfig,
    });

    render(
      <FormikTemplate>
        <BlockConfiguration name={BLOCK_FIELD_NAME} blockId={BLOCK_ID} />
      </FormikTemplate>
    );

    const linkButton = screen.getByText(expectedOptionText);

    expect(linkButton).not.toBeNull();
  });
});
