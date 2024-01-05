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
import { type RegistryId } from "@/types/registryTypes";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import type { MarketplaceListing } from "@/types/contract";
import { useAsyncIcon } from "@/components/asyncIcon";
import { type IconDefinition } from "@fortawesome/fontawesome-common-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cx from "classnames";
import styles from "./MarketplaceListingModIcon.module.scss";
import { DEFAULT_TEXT_ICON_COLOR } from "@/icons/constants";

const MarketplaceListingModIcon: React.FC<{
  modId: RegistryId;
  defaultIcon: IconDefinition;
  size?: "1x" | "2x";
}> = ({ modId, defaultIcon, size = "1x" }) => {
  const { data: listings } = useGetMarketplaceListingsQuery({
    package__name: modId,
  });

  // eslint-disable-next-line security/detect-object-injection -- RegistryId is not user input
  const listing: MarketplaceListing | undefined = listings?.[modId];
  const listingFaIcon = useAsyncIcon(listing?.fa_icon, defaultIcon);

  if (!listing) {
    return (
      <FontAwesomeIcon
        icon={defaultIcon}
        color={DEFAULT_TEXT_ICON_COLOR}
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
      color={listing?.icon_color ?? DEFAULT_TEXT_ICON_COLOR}
      size={size}
      fixedWidth
    />
  );
};

export default MarketplaceListingModIcon;
