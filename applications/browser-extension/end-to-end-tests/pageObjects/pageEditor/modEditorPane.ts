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
import { ConfigurationForm } from "./configurationForm";
import { expect } from "@playwright/test";

class MetadataConfigurationForm extends ConfigurationForm {
  modId = this.getByRole("textbox", { name: "Mod ID" });
  name = this.getByRole("textbox", { name: "Name" });
  version = this.getByRole("textbox", { name: "Version" });
  description = this.getByRole("textbox", { name: "Description" });
}

class CurrentInputsConfigurationForm extends ConfigurationForm {
  noConfigurationRequiredMessage = this.getByText(
    "This mod does not require any configuration",
  );
}

class ModVariablesDefinitionConfigurationForm extends ConfigurationForm {
  addVariableButton = this.getByRole("button", {
    name: "Add new mod variable",
  });
}

class InputConfigurationForm extends ConfigurationForm {
  addNewFieldButton = this.getByRole("button", { name: "Add new field" });
}

class LogsTableRow extends BasePageObject {
  timestamp = this.getByRole("cell").nth(1);
  level = this.getByRole("cell").nth(2);
  label = this.getByRole("cell").nth(3);
  brickId = this.getByRole("cell").nth(4);
  message = this.getByRole("cell").nth(5);
}

class LogsPane extends BasePageObject {
  logsTable = this.getByRole("table");

  async getLogsTableRows() {
    const rowElements = await this.logsTable.locator("tbody tr").all();
    return rowElements.map((row) => new LogsTableRow(row));
  }
}

export class ModEditorPane extends BasePageObject {
  editMetadataTab = this.getByRole("tab", { name: "Edit" });
  editMetadataTabPanel = new MetadataConfigurationForm(
    this.getByRole("tabpanel").filter({
      hasText: "Mod Metadata",
    }),
  );

  modVariablesTab = this.getByRole("tab", { name: "Mod Variables" });
  modVariablesTabPanel = new ModVariablesDefinitionConfigurationForm(
    this.getByRole("tabpanel").filter({
      hasText: "Mod Variables",
    }),
  );

  currentInputsTab = this.getByRole("tab", { name: "Current Inputs" });
  currentInputsTabPanel = new CurrentInputsConfigurationForm(
    this.getByRole("tabpanel").filter({
      hasText: "Mod Input Options",
    }),
  );

  logsTab = this.getByRole("tab", { name: "Logs" });
  async getLogsTabPanel() {
    const logsTabPanel = this.getByRole("tabpanel").filter({
      hasText: "Message/Error",
    });
    await expect(logsTabPanel).toBeVisible();
    return new LogsPane(logsTabPanel);
  }

  inputFormTab = this.getByRole("tab", { name: "Input Form" });
  inputFormTabPanel = new InputConfigurationForm(
    this.getByRole("tabpanel").filter({
      hasText: "Advanced: Mod Options",
    }),
  );
}
