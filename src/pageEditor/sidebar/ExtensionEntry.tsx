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

import { IExtension, UUID } from "@/core";
import { RecipeDefinition } from "@/types/definitions";
import React from "react";
import { FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { isExtension } from "./common";
import DynamicEntry from "./DynamicEntry";
import InstalledEntry from "./InstalledEntry";

type ExtensionEntryProps = {
  extension: IExtension | FormState;
  recipes: RecipeDefinition[];
  availableInstalledIds: UUID[];
  availableDynamicIds: UUID[];
  isNested?: boolean;
};

const ExtensionEntry: React.FunctionComponent<ExtensionEntryProps> = ({
  extension,
  recipes,
  availableInstalledIds,
  availableDynamicIds,
  isNested = false,
}) =>
  isExtension(extension) ? (
    <InstalledEntry
      key={`installed-${extension.id}`}
      extension={extension}
      recipes={recipes}
      isAvailable={
        !availableInstalledIds || availableInstalledIds.includes(extension.id)
      }
      isNested={isNested}
    />
  ) : (
    <DynamicEntry
      key={`dynamic-${extension.uuid}`}
      extension={extension}
      isAvailable={
        !availableDynamicIds || availableDynamicIds.includes(extension.uuid)
      }
      isNested={isNested}
    />
  );

export default ExtensionEntry;
