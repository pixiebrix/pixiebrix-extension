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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCube,
  faCubes,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
import { type Mod } from "@/types/modTypes";
import {
  getPackageId,
  isModDefinition,
  isUnavailableMod,
} from "@/utils/modUtils";
import MarketplaceListingIcon from "@/components/MarketplaceListingIcon";
import { DEFAULT_TEXT_ICON_COLOR } from "@/icons/constants";
import { type IconProp } from "@fortawesome/fontawesome-svg-core";

function getDefaultModIcon(mod: Mod): IconProp {
  if (isUnavailableMod(mod)) {
    return faExclamationCircle;
  }

  if (isModDefinition(mod) && mod.extensionPoints.length > 1) {
    return faCubes;
  }

  return faCube;
}

const ModIcon: React.FunctionComponent<{
  mod: Mod;
  size?: "1x" | "2x";
}> = ({ mod, size }) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only load default icon once
  const defaultIcon = useMemo(() => getDefaultModIcon(mod), []);
  const modId = getPackageId(mod);

  if (!modId) {
    return (
      <FontAwesomeIcon
        icon={faCube}
        color={DEFAULT_TEXT_ICON_COLOR}
        size={size}
        fixedWidth
      />
    );
  }

  return (
    <MarketplaceListingIcon
      packageId={modId}
      defaultIcon={defaultIcon}
      size={size}
    />
  );
};

export default ModIcon;
