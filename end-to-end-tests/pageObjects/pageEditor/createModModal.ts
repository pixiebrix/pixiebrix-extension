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
import { type UUID } from "@/types/stringTypes";
import { ModifiesModFormState } from "./utils";
import { uuidv4 } from "@/types/helpers";

export class CreateModModal extends BasePageObject {
  modIdInput = this.getByTestId("registryId-id-id");
  modNameInput = this.getByLabel("Name", { exact: true });
  saveButton = this.getByRole("button", { name: "Save" });

  /**
   * Creates a mod using the Create Mod modal, with the given modId and modName.
   * @param modName the modName to use
   * @param modUuid an optional UUID to force the modId to be unique, if not provided a random UUID will be generated
   */
  @ModifiesModFormState
  async createMod(modName: string, modUuid?: UUID): Promise<string> {
    const modId = `${modName.split(" ").join("-").toLowerCase()}-${
      modUuid ?? uuidv4()
    }`;

    await this.modIdInput.fill(modId);
    await this.modNameInput.fill(modName);
    await this.saveButton.click();

    return modId;
  }

  /**
   * Creates a copy of a mod using the Create Mod modal, with the given modId.
   * The mod name is derived from the original mod name plus "(Copy)"".
   * @param modName the modName to use
   * @param modUuid the UUID of the mod component from adding the starter brick
   */
  @ModifiesModFormState
  async copyMod(modName: string, modUuid: UUID): Promise<string> {
    const modId = `${modName.split(" ").join("-").toLowerCase()}-${modUuid}`;

    await this.modIdInput.fill(modId);
    await this.saveButton.click();

    return modId;
  }
}
