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

import { ReaderOutput } from "@/core";
import { registerFactory } from "@/blocks/readers/factory";
import { getComponentData } from "@/pageScript/protocol";

export interface ReactConfig {
  type: "react";
  selector: string;
  traverseUp?: number;
  rootProp?: string;
  waitMillis?: number;
}

async function doRead(reader: ReactConfig): Promise<ReaderOutput> {
  const { selector, traverseUp = 0, waitMillis = 1000, rootProp } = reader;
  return await getComponentData({
    framework: "react",
    selector,
    traverseUp,
    waitMillis,
    rootProp,
  });
}

registerFactory("react", doRead);
