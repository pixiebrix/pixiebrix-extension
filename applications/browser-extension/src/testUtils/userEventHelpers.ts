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

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Toggle the bootstrap switch widget field with the given field label.
 */
export async function toggleBootstrapSwitch(fieldLabel: string): Promise<void> {
  const element = screen.getByText(fieldLabel);

  // TODO: fix a11y of bootstrap-switch-button-react so we can target in tests
  // eslint-disable-next-line testing-library/no-node-access -- use of bootstrap-switch-button-react is not accessible
  const fieldGroup = element.nextSibling as HTMLElement;

  // eslint-disable-next-line testing-library/no-node-access -- use of bootstrap-switch-button-react is not accessible
  const switchElement = fieldGroup.querySelector(".switch");

  expect(switchElement).not.toBeNull();

  await userEvent.click(switchElement!);
}
