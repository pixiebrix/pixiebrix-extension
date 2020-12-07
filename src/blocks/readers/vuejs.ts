/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { createSendScriptMessage } from "@/messaging/chrome";
import { READ_VUE_VALUES } from "@/messaging/constants";
import { ReaderOutput } from "@/core";
import { registerFactory } from "@/blocks/readers/factory";

export interface VueConfig {
  type: "vuejs";
  selector: string;
}

export const withVueValues = createSendScriptMessage<ReaderOutput>(
  READ_VUE_VALUES
);

async function doRead(reader: VueConfig): Promise<ReaderOutput> {
  const { selector } = reader;
  return await withVueValues({
    selector,
  });
}

registerFactory("vuejs", doRead);
