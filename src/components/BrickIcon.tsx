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

import React from "react";
import { type IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
import { TriggerStarterBrickABC } from "@/starterBricks/triggerExtension";
import { MenuItemStarterBrickABC } from "@/starterBricks/menuItemExtension";
import { ContextMenuStarterBrickABC } from "@/starterBricks/contextMenu";
import { PanelStarterBrickABC } from "@/starterBricks/panelExtension";
import { SidebarStarterBrickABC } from "@/starterBricks/sidebarExtension";
import { appApi } from "@/services/api";
import { useAsyncState } from "@/hooks/common";
import { useAsyncIcon } from "@/components/asyncIcon";
import { type MarketplaceListing } from "@/types/contract";
import getType from "@/runtime/getType";
import { type BrickType } from "@/runtime/runtimeTypes";
import { type Metadata } from "@/types/registryTypes";

function getDefaultBrickIcon<T extends Metadata>(
  brick: T,
  blockType: BrickType
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

  if (brick instanceof MenuItemStarterBrickABC) {
    return faMousePointer;
  }

  if (brick instanceof ContextMenuStarterBrickABC) {
    return faBars;
  }

  if (brick instanceof PanelStarterBrickABC) {
    return faWindowMaximize;
  }

  if (brick instanceof SidebarStarterBrickABC) {
    return faColumns;
  }

  return faCube;
}

const SIZE_REGEX = /^(?<size>\d)x$/i;

type BrickIconProps<T extends Metadata> = {
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
const BrickIcon = <T extends Metadata>({
  brick,
  size = "1x",
  faIconClass = "",
  inheritColor = false,
}: BrickIconProps<T>) => {
  const { data: listings = {} } =
    // BrickIcon only gets the data from the store. The API query must be issued by a parent component.
    appApi.endpoints.getMarketplaceListings.useQueryState();

  const listing: MarketplaceListing | null = listings[brick.id];

  const [type] = useAsyncState(async () => getType(brick), [brick]);

  const listingFaIcon = useAsyncIcon(
    listing?.fa_icon,
    getDefaultBrickIcon(brick, type)
  );

  const sizeMultiplier = SIZE_REGEX.exec(size).groups?.size;
  // Setting height and width via em allows for scaling with font size
  const cssSize = `${sizeMultiplier}em`;

  return listing?.image ? (
    // Don't use the `width`/`height` attributes because they don't work with `em`
    <img
      src={listing.image.url}
      alt="Icon"
      style={{ width: cssSize, height: cssSize }}
    />
  ) : (
    <FontAwesomeIcon
      icon={listingFaIcon}
      color={inheritColor ? "inherit" : listing?.icon_color ?? "darkGrey"}
      className={faIconClass}
      size={size}
      fixedWidth
    />
  );
};

export default BrickIcon;
