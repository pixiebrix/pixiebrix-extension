/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useMemo, useState } from "react";
import { IBrick } from "@/core";
import { BlockType, getType } from "@/blocks/util";
import { useAsyncEffect } from "use-async-effect";
import { IconProp, library } from "@fortawesome/fontawesome-svg-core";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
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
  fas,
  faWindowMaximize,
} from "@fortawesome/free-solid-svg-icons";
import { TriggerExtensionPoint } from "@/extensionPoints/triggerExtension";
import { MenuItemExtensionPoint } from "@/extensionPoints/menuItemExtension";
import { ContextMenuExtensionPoint } from "@/extensionPoints/contextMenu";
import { PanelExtensionPoint } from "@/extensionPoints/panelExtension";
import { ActionPanelExtensionPoint } from "@/extensionPoints/actionPanelExtension";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import cx from "classnames";

library.add(fas, fab, far);

export function getIcon(brick: IBrick, blockType: BlockType): IconProp {
  if ("schema" in brick) {
    return faCloud;
  }

  switch (blockType) {
    case "reader":
      return faBookReader;
    case "transform":
      return faRandom;
    case "effect":
      return faMagic;
    case "renderer":
      return faWindowMaximize;
    default:
      break;
  }

  if (brick instanceof TriggerExtensionPoint) {
    return faBolt;
  }

  if (brick instanceof MenuItemExtensionPoint) {
    return faMousePointer;
  }

  if (brick instanceof ContextMenuExtensionPoint) {
    return faBars;
  }

  if (brick instanceof PanelExtensionPoint) {
    return faWindowMaximize;
  }

  if (brick instanceof ActionPanelExtensionPoint) {
    return faColumns;
  }

  return faCube;
}

const SIZE_REGEX = /^(?<size>\d)x$/i;

/**
 * WARNING: avoid rendering a lot of brick icons (20+) icons on a page at once. Each one waits for the marketplace
 * listing and searches all the listings.
 */
const BrickIcon: React.FunctionComponent<{
  brick: IBrick;
  size?: "1x" | "2x";
}> = ({ brick, size = "1x" }) => {
  const [type, setType] = useState<BlockType>(null);
  // XXX: process the result and map by id for faster lookup
  const { data: listings } = useGetMarketplaceListingsQuery();

  const listing = useMemo(
    () => (listings ?? []).find((listing) => listing.package.name === brick.id),
    [listings, brick.id]
  );

  const sizeMultiplier = SIZE_REGEX.exec(size).groups?.size;
  // Setting height and width via em allows for scaling with font size
  const cssSize = `${sizeMultiplier}em`;

  useAsyncEffect(async () => {
    setType(await getType(brick));
  }, [brick, setType]);

  const fa_icon = useMemo(() => {
    if (listing?.fa_icon) {
      // The fa_icon database value is a string e.g. "fas fa-coffee"
      const icon = listing.fa_icon.split(" ");
      icon[1] = icon[1].replace("fa-", "");
      return icon as IconProp;
    }

    return getIcon(brick, type);
  }, [brick, type, listing]);

  return (
    <>
      {listing?.image == null ? (
        <FontAwesomeIcon
          icon={fa_icon}
          color={listing?.icon_color}
          className={cx({ "text-muted": !listing?.icon_color })}
          size={size}
          fixedWidth
        />
      ) : (
        <svg width={cssSize} height={cssSize}>
          <image
            xlinkHref={listing?.image.url}
            width={cssSize}
            height={cssSize}
          />
        </svg>
      )}
    </>
  );
};

export default BrickIcon;
