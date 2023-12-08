/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type ModDefinition } from "@/types/modDefinitionTypes";
import React from "react";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { isModComponentBase } from "./common";
import DynamicModComponentListItem from "./DynamicModComponentListItem";
import ActivatedModComponentListItem from "./ActivatedModComponentListItem";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { type UUID } from "@/types/stringTypes";

type ModComponentListItemProps = {
  extension: ModComponentBase | ModComponentFormState;
  recipes: ModDefinition[];
  availableInstalledIds: UUID[];
  availableDynamicIds: UUID[];
  isNested?: boolean;
};

const ModComponentListItem: React.FunctionComponent<
  ModComponentListItemProps
> = ({
  extension,
  recipes,
  availableInstalledIds,
  availableDynamicIds,
  isNested = false,
}) =>
  isModComponentBase(extension) ? (
    <ActivatedModComponentListItem
      key={`installed-${extension.id}`}
      extension={extension}
      recipes={recipes}
      isAvailable={
        !availableInstalledIds || availableInstalledIds.includes(extension.id)
      }
      isNested={isNested}
    />
  ) : (
    <DynamicModComponentListItem
      key={`dynamic-${extension.uuid}`}
      extension={extension}
      isAvailable={
        !availableDynamicIds || availableDynamicIds.includes(extension.uuid)
      }
      isNested={isNested}
    />
  );

export default ModComponentListItem;
