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

import React, { useMemo } from "react";
import { type IconProp } from "@fortawesome/fontawesome-svg-core";
import {
  faBars,
  faBolt,
  faBookReader,
  faCloud,
  faColumns,
  faCube,
  faMagic,
  faMousePointer,
  faRandom,
  faWindowMaximize,
} from "@fortawesome/free-solid-svg-icons";
import { TriggerStarterBrickABC } from "@/starterBricks/trigger/triggerStarterBrick";
import { ButtonStarterBrickABC } from "@/starterBricks/button/buttonStarterBrick";
import { ContextMenuStarterBrickABC } from "@/starterBricks/contextMenu/contextMenuStarterBrick";
import { SidebarStarterBrickABC } from "@/starterBricks/sidebar/sidebarStarterBrick";
import getType from "@/runtime/getType";
import { type BrickType } from "@/runtime/runtimeTypes";
import { type PackageInstance } from "@/types/registryTypes";
import useAsyncState from "@/hooks/useAsyncState";
import MarketplaceListingIcon from "@/components/MarketplaceListingIcon";
import { type Nullishable } from "@/utils/nullishUtils";

function getDefaultBrickIcon<T extends PackageInstance>(
  brick: T,
  blockType: Nullishable<BrickType>,
): IconProp {
  if ("schema" in brick) {
    return faCloud;
  }

  switch (blockType) {
    case "reader": {
      return faBookReader;
    }

    case "transform": {
      return faRandom;
    }

    case "effect": {
      return faMagic;
    }

    case "renderer": {
      return faWindowMaximize;
    }

    default: {
      break;
    }
  }

  if (brick instanceof TriggerStarterBrickABC) {
    return faBolt;
  }

  if (brick instanceof ButtonStarterBrickABC) {
    return faMousePointer;
  }

  if (brick instanceof ContextMenuStarterBrickABC) {
    return faBars;
  }

  if (brick instanceof SidebarStarterBrickABC) {
    return faColumns;
  }

  return faCube;
}

type BrickIconProps<T extends PackageInstance> = {
  brick: T;
  size?: "1x" | "2x";

  /**
   * Sets a className only in cases where a <FontAwesomeIcon/> is used
   */
  faIconClass?: string;

  /**
   * This makes brick icons that use basic font awesome icons
   * inherit the editor node layout color scheme.
   * Customized SVG icons are unaffected and keep their branded
   * color schemes.
   */
  inheritColor?: boolean;
};

/**
 * WARNING: avoid rendering a lot of brick icons (20+) icons on a page at once. Each one waits for the marketplace
 * listing and searches all the listings.
 */
const BrickIcon = <T extends PackageInstance>({
  brick,
  size,
  faIconClass,
  inheritColor = false,
}: BrickIconProps<T>) => {
  const { data: type } = useAsyncState(async () => getType(brick), [brick]);
  const defaultIcon = useMemo(
    () => getDefaultBrickIcon(brick, type),
    [brick, type],
  );

  return (
    <MarketplaceListingIcon
      packageId={brick.id}
      defaultIcon={defaultIcon}
      size={size}
      faIconClass={faIconClass}
      inheritColor={inheritColor}
    />
  );
};

export default BrickIcon;
