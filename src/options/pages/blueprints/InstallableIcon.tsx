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

import React, { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCube, faCubes } from "@fortawesome/free-solid-svg-icons";
import { useAsyncIcon } from "@/components/asyncIcon";
import { MarketplaceListing } from "@/types/contract";
import { Installable } from "@/options/pages/blueprints/blueprintsTypes";
import { isBlueprint } from "@/options/pages/blueprints/utils/installableUtils";

function getDefaultInstallableIcon(installable: Installable) {
  if (isBlueprint(installable) && installable.extensionPoints.length > 1) {
    return faCubes;
  }

  return faCube;
}

const SIZE_REGEX = /^(?<size>\d)x$/i;
const DARK_LAVENDER = "rgb(101, 98, 170)";

const InstallableIcon: React.FunctionComponent<{
  listing: MarketplaceListing;
  installable: Installable;
  isLoading: boolean;
  size?: "1x" | "2x";
  /**
   * Sets a className only in cases where a <FontAwesomeIcon/> is used
   */
  faIconClass?: string;
}> = ({ listing, installable, isLoading, size = "1x", faIconClass = "" }) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only load default icon once
  const defaultIcon = useMemo(() => getDefaultInstallableIcon(installable), []);
  const listingFaIcon = useAsyncIcon(listing?.fa_icon, defaultIcon);

  const sizeMultiplier = SIZE_REGEX.exec(size).groups?.size;
  // Setting height and width via em allows for scaling with font size
  const cssSize = `${sizeMultiplier}em`;

  if (isLoading) {
    return <FontAwesomeIcon icon={faCube} color={DARK_LAVENDER} size={size} />;
  }

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
      color={listing?.icon_color ?? DARK_LAVENDER}
      className={faIconClass}
      size={size}
      fixedWidth
    />
  );
};

export default InstallableIcon;
