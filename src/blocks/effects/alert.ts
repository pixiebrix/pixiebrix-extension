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

import { Effect } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";

export class AlertEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/browser/alert",
      "Window Alert",
      "Show an alert in the window",
      "faSearch"
    );
  }

  inputSchema: Schema = propertiesToSchema({
    message: {
      type: ["string", "number", "boolean"],
      description: "A string you want to display in the alert dialog",
    },
  });

  async effect({ message }: BlockArg): Promise<void> {
    // eslint-disable-next-line no-alert
    window.alert(String(message));
  }
}

registerBlock(new AlertEffect());
