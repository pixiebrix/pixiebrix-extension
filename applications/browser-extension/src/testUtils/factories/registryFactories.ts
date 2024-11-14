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

import { define, derive } from "cooky-cutter";
import { type Sharing } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";
import {
  type EditablePackageMetadata,
  type PackageVersionDeprecated,
} from "@/types/contract";
import {
  autoUUIDSequence,
  registryIdFactory,
  timestampFactory,
} from "@/testUtils/factories/stringFactories";
import { dumpBrickYaml } from "@/runtime/brickYaml";

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
  id: autoUUIDSequence,
  name: registryIdFactory,
  verbose_name: (n: number) => `Editable Package ${n}`,
  version: "1.0.0",
  kind: "Blueprint",
  updated_at: timestampFactory,
  sharing: personalSharingDefinitionFactory,
  _editableBrickBrand: undefined as never,
});

/**
 * @deprecated see https://github.com/pixiebrix/pixiebrix-extension/issues/7692
 */
// TODO remove in https://github.com/pixiebrix/pixiebrix-extension/issues/7692
export const packageVersionDeprecatedFactory = define<PackageVersionDeprecated>(
  {
    id: autoUUIDSequence(),
    version: "1.0.0",
    config() {
      throw new Error("Provide a definition factory for 'config'");
    },
    raw_config: derive<
      PackageVersionDeprecated,
      PackageVersionDeprecated["raw_config"]
    >(({ config }) => dumpBrickYaml(config), "config"),
    created_at: timestampFactory,
    updated_at: timestampFactory,
    updated_by: {},
  },
);
