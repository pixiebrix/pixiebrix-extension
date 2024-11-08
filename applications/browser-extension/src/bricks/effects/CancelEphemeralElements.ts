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

import { EffectABC } from "../../types/bricks/effectTypes";
import * as formController from "../../platform/forms/formController";
import * as panelController from "../../platform/panels/panelController";
import { type Schema, SCHEMA_EMPTY_OBJECT } from "../../types/schemaTypes";

import { validateRegistryId } from "../../types/helpers";
import { allSettled } from "../../utils/promiseUtils";

/**
 * Cancels all temporary forms/panels showing in the frame.
 *
 * Introduced to support hiding modals showing on other tabs, e.g., for the notifications mod.
 *
 * @since 1.8.13
 */
class CancelEphemeralElements extends EffectABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/display/cancel");

  constructor() {
    super(
      CancelEphemeralElements.BRICK_ID,
      "[Experimental] Cancel All Forms/Panels",
      "Cancels all temporary forms/panels showing in the frame",
    );
  }

  inputSchema: Schema = SCHEMA_EMPTY_OBJECT;

  async effect(): Promise<void> {
    await allSettled(
      [formController.cancelAll(), panelController.cancelAll()],
      { catch: "ignore" },
    );
  }
}

export default CancelEphemeralElements;
