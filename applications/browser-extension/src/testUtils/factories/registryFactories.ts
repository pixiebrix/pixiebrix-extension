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
import { type Sharing } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";
import { type EditablePackageMetadata } from "@/types/contract";
import {
  autoUUIDSequence,
  registryIdFactory,
  timestampFactory,
} from "@/testUtils/factories/stringFactories";

export const personalSharingDefinitionFactory = define<Sharing>({
  public: false,
  organizations: () => [] as UUID[],
});

export const publicSharingDefinitionFactory = define<Sharing>({
  public: true,
  organizations: () => [] as UUID[],
});

export const teamSharingDefinitionFactory = define<Sharing>({
  public: false,
  organizations: () => [autoUUIDSequence()],
});

export const editablePackageMetadataFactory = define<EditablePackageMetadata>({
  id: autoUUIDSequence(),
  name: registryIdFactory(),
  verbose_name: (n: number) => `Editable Package ${n}`,
  version: "1.0.0",
  kind: "Blueprint",
  updated_at: timestampFactory(),
  sharing: personalSharingDefinitionFactory,
  _editableBrickBrand: undefined as never,
});
