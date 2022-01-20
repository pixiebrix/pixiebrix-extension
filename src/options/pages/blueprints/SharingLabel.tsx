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

import React from "react";
import { Installable } from "@/options/pages/blueprints/installableUtils";
import useSharing from "@/options/pages/blueprints/useSharing";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEyeSlash,
  faGlobe,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";

const sharingIcons = {
  Personal: faEyeSlash,
  Team: faUsers,
  Public: faGlobe,
  Deployment: faUsers,
};

const SharingLabel: React.FunctionComponent<{
  installable: Installable;
}> = ({ installable }) => {
  const sharing = useSharing(installable);

  return (
    <span>
      <FontAwesomeIcon icon={sharingIcons[sharing.type]} /> {sharing.label}
    </span>
  );
};

export default SharingLabel;
