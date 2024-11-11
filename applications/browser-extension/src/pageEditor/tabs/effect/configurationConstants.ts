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

import { type Option } from "@/components/form/widgets/SelectWidget";
import { type BrickWindow } from "@/bricks/types";

export const rootModeOptions: Option[] = [
  { label: "Document", value: "document" },
  { label: "Element", value: "element" },
  { label: "Inherit", value: "inherit" },
];

export const windowOptions: Array<Option<BrickWindow>> = [
  { label: "Current Tab/Frame", value: "self" },
  { label: "Top-level Frame", value: "top" },
  { label: "All Frames", value: "all_frames" },
  { label: "Opener Tab", value: "opener" },
  { label: "Target Tab", value: "target" },
  { label: "All Other Tabs", value: "broadcast" },
];
