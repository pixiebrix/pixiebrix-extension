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

import React, { useState } from "react";
import { IBrick } from "@/core";
import { Split } from "type-fest";
import { BlockType, getType } from "@/blocks/util";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
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
import { TriggerExtensionPoint } from "@/extensionPoints/triggerExtension";
import { MenuItemExtensionPoint } from "@/extensionPoints/menuItemExtension";
import { ContextMenuExtensionPoint } from "@/extensionPoints/contextMenu";
import { PanelExtensionPoint } from "@/extensionPoints/panelExtension";
import { ActionPanelExtensionPoint } from "@/extensionPoints/actionPanelExtension";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import cx from "classnames";
import { useAsyncState } from "@/hooks/common";
import { useAsyncEffect } from "use-async-effect";
import { fetchFortAwesomeIcon } from "@/components/AsyncIcon";

export function getDefaultBrickIcon(
  brick: IBrick,
  blockType: BlockType
): IconProp {
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
  // This prop sets a className only in cases where a <FontAwesomeIcon/> is used
  faIconClass?: string;
}> = ({ brick, size = "1x", faIconClass = "" }) => {
  const [type] = useAsyncState(async () => getType(brick), [brick]);
  const { data: listings = {} } = useGetMarketplaceListingsQuery();

  const listing = listings[brick.id];

  const sizeMultiplier = SIZE_REGEX.exec(size).groups?.size;
  // Setting height and width via em allows for scaling with font size
  const cssSize = `${sizeMultiplier}em`;

  const [faIcon, setFaIcon] = useState<IconProp>(
    getDefaultBrickIcon(brick, type)
  );

  useAsyncEffect(
    async (isMounted) => {
      if (listing.fa_icon) {
        // The fa_icon database value is a string e.g. "fas fa-coffee"
        const [library, icon] = listing.fa_icon.split(" ") as Split<
          typeof listing.fa_icon,
          " "
        >;
        const svg = await fetchFortAwesomeIcon(library, icon);
        if (!isMounted()) {
          return;
        }

        if (svg) {
          setFaIcon(svg);
        }
      }
    },
    [listing]
  );

  return (
    <>
      {listing?.image == null ? (
        <FontAwesomeIcon
          icon={faIcon}
          color={listing?.icon_color}
          className={cx(faIconClass, { "text-muted": !listing?.icon_color })}
          size={size}
          fixedWidth
        />
      ) : (
        <svg width={cssSize} height={cssSize}>
          <image
            xlinkHref={listing.image.url}
            width={cssSize}
            height={cssSize}
          />
        </svg>
      )}
    </>
  );
};

export default BrickIcon;
