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

class MetadataConfigurationForm extends ConfigurationForm {
  modId = this.getByLabel("Mod ID");
  name = this.getByLabel("Name");
  version = this.getByLabel("Version");
  description = this.getByLabel("Description");
}

class CurrentInputsConfigurationForm extends ConfigurationForm {
  noConfigurationRequiredMessage = this.getByText(
    "This mod does not require any configuration",
  );
}

class InputConfigurationForm extends ConfigurationForm {
  addNewFieldButton = this.getByRole("button", { name: "Add new field" });
}

export class ModEditorPane extends BasePageObject {
  editMetadataTab = this.getByRole("tab", { name: "Edit" });
  editMetadataTabPanel = new MetadataConfigurationForm(
    this.getByRole("tabpanel").filter({
      hasText: "Mod Metadata",
    }),
  );

  currentInputsTab = this.getByRole("tab", { name: "Current Inputs" });
  currentInputsTabPanel = new CurrentInputsConfigurationForm(
    this.getByRole("tabpanel").filter({
      hasText: "Mod Input Options",
    }),
  );

  inputFormTab = this.getByRole("tab", { name: "Input Form" });
  inputFormTabPanel = new InputConfigurationForm(
    this.getByRole("tabpanel").filter({
      hasText: "Advanced: Mod Options",
    }),
  );
}
