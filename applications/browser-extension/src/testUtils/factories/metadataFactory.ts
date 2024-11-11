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

import { define } from "cooky-cutter";
import type { VersionedMetadata } from "@/types/registryTypes";
import { validateRegistryId, normalizeSemVerString } from "@/types/helpers";

export const metadataFactory = define<VersionedMetadata>({
  id: (n: number) => validateRegistryId(`test/mod-${n}`),
  name: (n: number) => `Mod ${n}`,
  description: "Mod generated from factory",
  version: normalizeSemVerString("1.0.0"),
});
