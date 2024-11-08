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
import { type RegistryId } from "@/types/registryTypes";
import { useGetMarketplaceListingQuery } from "@/data/service/api";
import { useAsyncIcon } from "./asyncIcon";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cx from "classnames";
import styles from "./MarketplaceListingModIcon.module.scss";
import { DEFAULT_TEXT_ICON_COLOR } from "../icons/constants";
import { type IconProp } from "@fortawesome/fontawesome-svg-core";

const MarketplaceListingIcon: React.FC<{
  packageId: RegistryId;
  defaultIcon: IconProp;
  size?: "1x" | "2x";
  faIconClass?: string;
  inheritColor?: boolean;
}> = ({
  packageId,
  defaultIcon,
  size = "1x",
  faIconClass = "",
  inheritColor = false,
}) => {
  const { data: listing } = useGetMarketplaceListingQuery({ packageId });

  const listingFaIcon = useAsyncIcon(listing?.fa_icon, defaultIcon);

  if (!listing) {
    return (
      <FontAwesomeIcon
        icon={defaultIcon}
        color={inheritColor ? "inherit" : DEFAULT_TEXT_ICON_COLOR}
        className={faIconClass}
        size={size}
        fixedWidth
      />
    );
  }

  return listing?.image ? (
    <img
      src={listing.image.url}
      alt="Icon"
      className={cx(styles.imageIcon, {
        [styles.size1 ?? ""]: size === "1x",
        [styles.size2 ?? ""]: size === "2x",
      })}
    />
  ) : (
    <FontAwesomeIcon
      icon={listingFaIcon}
      color={
        inheritColor
          ? "inherit"
          : listing?.icon_color ?? DEFAULT_TEXT_ICON_COLOR
      }
      className={faIconClass}
      size={size}
      fixedWidth
    />
  );
};

export default MarketplaceListingIcon;
