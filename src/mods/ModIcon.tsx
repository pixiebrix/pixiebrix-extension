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
import React, { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCube,
  faCubes,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
import { useAsyncIcon } from "@/components/asyncIcon";
import { type MarketplaceListing } from "@/types/contract";
import { type Mod } from "@/mods/modTypes";
import {
  getPackageId,
  isBlueprint,
  isUnavailableRecipe,
} from "@/utils/modUtils";
import cx from "classnames";
import styles from "./ModIcon.module.scss";
import { useGetMarketplaceListingsQuery } from "@/services/api";

function getDefaultModIcon(mod: Mod) {
  if (isUnavailableRecipe(mod)) {
    return faExclamationCircle;
  }

  if (isBlueprint(mod) && mod.extensionPoints.length > 1) {
    return faCubes;
  }

  return faCube;
}

export const DEFAULT_TEXT_ICON_COLOR = "#241C32";

const ModIcon: React.FunctionComponent<{
  mod: Mod;
  size?: "1x" | "2x";
  /**
   * Sets a className only in cases where a <FontAwesomeIcon/> is used
   */
  faIconClass?: string;
}> = ({ mod, size = "1x", faIconClass = "" }) => {
  const {
    data: listings,
    isLoading,
    isSuccess,
  } = useGetMarketplaceListingsQuery();

  const listing: MarketplaceListing | null = isSuccess
    ? listings[getPackageId(mod)]
    : null;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- only load default icon once
  const defaultIcon = useMemo(() => getDefaultModIcon(mod), []);
  const listingFaIcon = useAsyncIcon(listing?.fa_icon, defaultIcon);

  if (isLoading) {
    return (
      <FontAwesomeIcon
        icon={faCube}
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
        [styles.size1]: size === "1x",
        [styles.size2]: size === "2x",
      })}
    />
  ) : (
    <FontAwesomeIcon
      icon={listingFaIcon}
      color={listing?.icon_color ?? DEFAULT_TEXT_ICON_COLOR}
      className={faIconClass}
      size={size}
      fixedWidth
    />
  );
};

export default ModIcon;
