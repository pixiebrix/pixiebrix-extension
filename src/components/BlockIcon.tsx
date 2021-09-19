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
import { IBlock, IService } from "@/core";
import { BlockType, getType } from "@/blocks/util";
import { useAsyncEffect } from "use-async-effect";
import { library, IconProp } from "@fortawesome/fontawesome-svg-core";
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

// TODO: Unable to use dynamic font awesome icons without importing them first
//  maybe there is a better way to do this?
library.add(fas, fab, far);

export function getIcon(block: IBlock | IService, type: BlockType): IconProp {
  if ("schema" in block) {
    return faCloud;
  }

  switch (type) {
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

  if (block instanceof TriggerExtensionPoint) {
    return faBolt;
  }

  if (block instanceof MenuItemExtensionPoint) {
    return faMousePointer;
  }

  if (block instanceof ContextMenuExtensionPoint) {
    return faBars;
  }

  if (block instanceof PanelExtensionPoint) {
    return faWindowMaximize;
  }

  if (block instanceof ActionPanelExtensionPoint) {
    return faColumns;
  }

  return faCube;
}

const SIZE_REGEX = /^(?<size>\d)x$/i;

const BlockIcon: React.FunctionComponent<{
  block: IBlock | IService;
  size?: "1x" | "2x";
}> = ({ block, size = "1x" }) => {
  const [type, setType] = useState<BlockType>(null);
  const { data: listings } = useGetMarketplaceListingsQuery();

  const listing = useMemo(
    () => (listings ?? []).find((listing) => listing.package.name === block.id),
    [listings, block.id]
  );

  const sizeMultiplier = SIZE_REGEX.exec(size).groups?.size;
  // Setting height and width via em allows for scaling with font size
  const cssSize = `${sizeMultiplier}em`;

  useAsyncEffect(async () => {
    setType(await getType(block));
  }, [block, setType]);

  const fa_icon = useMemo(() => {
    if (listing?.fa_icon) {
      // The fa_icon database value includes the css class e.g. far, fab, etc.
      const icon = listing.fa_icon.split(" ");
      icon[1] = icon[1].replace("fa-", "");
      return icon as IconProp;
    }

    return getIcon(block, type);
  }, [block, type, listing]);

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

export default BlockIcon;
