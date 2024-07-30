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

import { BasePageObject } from "../basePageObject";
import { ModifiesModFormState } from "./utils";

export class ConfigurationForm extends BasePageObject {
  @ModifiesModFormState
  async fillField(fieldLabel: string, value: string) {
    const field = this.getByLabel(fieldLabel);
    // Click to enable the field, if it's not already enabled
    await field.click();
    await field.fill(value);
  }

  @ModifiesModFormState
  async fillFieldByPlaceholder(fieldPlaceholder: string, value: string) {
    const field = this.getByPlaceholder(fieldPlaceholder);
    // Click to enable the field, if it's not already enabled
    await field.click();
    await field.fill(value);
  }

  @ModifiesModFormState
  async toggleSwitch(label: string) {
    await this.getSwitchByLabel(label).click();
  }

  @ModifiesModFormState
  async chooseMultiselectOption(label: string, option: string) {
    await this.getByLabel(label).click();
    await this.getByRole("option", { name: option }).click();
  }

  @ModifiesModFormState
  async chooseSelectOption(label: string, option: string) {
    await this.getByLabel(label).selectOption(option);
  }

  @ModifiesModFormState
  async waitForModFormStateToUpdate() {}

  @ModifiesModFormState
  async clickShortcut(fieldLabel: string, linkLabel: string) {
    const field = await this.getFieldGroup(fieldLabel);
    await field.getByRole("button", { name: linkLabel, exact: true }).click();
  }

  async getFieldGroup(label: string) {
    return this.getByTestId("field-template-form-group").filter({
      hasText: label,
    });
  }
}
