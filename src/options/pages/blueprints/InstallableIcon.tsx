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

import React, { useState } from "react";
import { Split } from "type-fest";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faBolt,
  faColumns,
  faCube,
  faMousePointer,
  faScroll,
  faThLarge,
  faWindowMaximize,
} from "@fortawesome/free-solid-svg-icons";
import { useAsyncEffect } from "use-async-effect";
import { fetchFortAwesomeIcon } from "@/components/AsyncIcon";
import { MarketplaceListing } from "@/types/contract";
import { Installable } from "@/options/pages/blueprints/blueprintsTypes";
import { isBlueprint } from "@/options/pages/blueprints/installableUtils";
import { selectType } from "@/devTools/editor/extensionPoints/adapter";
import { IExtension } from "@/core";
import { useAsyncState } from "@/hooks/common";

const extensionTypeIcons = {
  menuItem: faMousePointer,
  trigger: faBolt,
  panel: faWindowMaximize,
  contextMenu: faBars,
  actionPanel: faColumns,
  quickBar: faThLarge,
};

async function getDefaultInstallableIcon(
  installable: Installable
): Promise<IconProp> {
  if (isBlueprint(installable)) {
    return faScroll;
  }

  try {
    const type = await selectType(installable as IExtension);
    return extensionTypeIcons[type];
  } catch {
    return faCube;
  }

  return faCube;
}

const SIZE_REGEX = /^(?<size>\d)x$/i;

/**
 * WARNING: avoid rendering a lot of brick icons (20+) icons on a page at once. Each one waits for the marketplace
 * listing and searches all the listings.
 */
const InstallableIcon: React.FunctionComponent<{
  listing: MarketplaceListing;
  installable: Installable;
  size?: "1x" | "2x";
  /**
   * Sets a className only in cases where a <FontAwesomeIcon/> is used
   */
  faIconClass?: string;
}> = ({ listing, installable, size = "1x", faIconClass = "" }) => {
  const [listingFaIcon, setFaListingIcon] = useState<IconProp | undefined>();

  const [defaultIcon] = useAsyncState(async () =>
    getDefaultInstallableIcon(installable)
  );

  useAsyncEffect(
    async (isMounted) => {
      if (!listing?.fa_icon) {
        return;
      }

      // The fa_icon database value is a string e.g. "fas fa-coffee"
      const [library, icon] = listing.fa_icon.split(" ") as Split<
        typeof listing.fa_icon,
        " "
      >;

      let svg: IconProp;

      try {
        svg = await fetchFortAwesomeIcon(library, icon);
      } catch {
        console.warn("Error dynamically loading FontAwesome icon", {
          library,
          icon,
        });
        // Don't do anything, because we're already using the default brick icon
        return;
      }

      if (!isMounted()) {
        return;
      }

      setFaListingIcon(svg);
    },
    [listing, setFaListingIcon]
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
      icon={listingFaIcon ?? defaultIcon ?? faCube}
      color={listing?.icon_color ?? "darkGrey"}
      className={faIconClass}
      size={size}
      fixedWidth
    />
  );
};

export default InstallableIcon;
