/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { withReadWindow } from "@/common";
import { ReaderOutput } from "@/core";
import { registerFactory } from "@/blocks/readers/factory";

type PathSpecObj = Record<string, string>;
export type PathSpec = string | PathSpecObj;

export interface WindowConfig {
  type: "window";
  waitMillis?: number;
  pathSpec: PathSpec;
}

async function handleFlatten(
  pathSpec: PathSpec,
  factory: (arg: PathSpecObj) => Promise<any>
): Promise<any> {
  const pathSpecObj: PathSpecObj =
    typeof pathSpec === "string" ? { value: pathSpec } : pathSpec;
  const values = await factory(pathSpecObj);
  return typeof values === "object" ? values.value : values;
}

async function doRead(reader: WindowConfig): Promise<ReaderOutput> {
  const { pathSpec: rawPathSpec, waitMillis } = reader;
  return handleFlatten(rawPathSpec, async (pathSpec) =>
    withReadWindow({
      pathSpec,
      waitMillis,
    })
  );
}

registerFactory("window", doRead);
