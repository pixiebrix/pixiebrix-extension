/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ICON_MAP } from "@/devTools/editor/extensionPoints/adapter";
import {
  faEyeSlash,
  faPuzzlePiece,
  faSave,
} from "@fortawesome/free-solid-svg-icons";

export const ExtensionIcon: React.FunctionComponent<{ type: string }> = ({
  type,
}) => {
  return <FontAwesomeIcon icon={ICON_MAP.get(type) ?? faPuzzlePiece} />;
};

export const NotAvailableIcon: React.FunctionComponent = () => (
  <FontAwesomeIcon icon={faEyeSlash} title="Not available on page" />
);

export const UnsavedChangesIcon: React.FunctionComponent = () => (
  <FontAwesomeIcon icon={faSave} title="Has unsaved changes" />
);
