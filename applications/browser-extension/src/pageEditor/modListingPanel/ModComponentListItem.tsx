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

import React from "react";
import { type ModComponentSidebarItem } from "./common";
import DraftModComponentListItem from "./DraftModComponentListItem";
import ActivatedModComponentListItem from "./ActivatedModComponentListItem";
import { type UUID } from "@/types/stringTypes";
import { isModComponentBase } from "@/pageEditor/utils";

type ModComponentListItemProps = {
  modComponentSidebarItem: ModComponentSidebarItem;
  availableActivatedModComponentIds: UUID[];
  availableDraftModComponentIds: UUID[];
  isNested?: boolean;
};

const ModComponentListItem: React.FunctionComponent<
  ModComponentListItemProps
> = ({
  modComponentSidebarItem,
  availableActivatedModComponentIds,
  availableDraftModComponentIds,
  isNested = false,
}) =>
  isModComponentBase(modComponentSidebarItem) ? (
    <ActivatedModComponentListItem
      modComponent={modComponentSidebarItem}
      isAvailable={
        !availableActivatedModComponentIds ||
        availableActivatedModComponentIds.includes(modComponentSidebarItem.id)
      }
      isNested={isNested}
    />
  ) : (
    <DraftModComponentListItem
      modComponentFormState={modComponentSidebarItem}
      isAvailable={
        !availableDraftModComponentIds ||
        availableDraftModComponentIds.includes(modComponentSidebarItem.uuid)
      }
      isNested={isNested}
    />
  );

export default ModComponentListItem;
