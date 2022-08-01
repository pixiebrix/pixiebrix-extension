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
import AsyncButton from "@/components/AsyncButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave } from "@fortawesome/free-solid-svg-icons";
import rootStyles from "./ActionButtons.module.scss";
import styles from "./SaveButtonDark.module.scss";
import cx from "classnames";

const SaveButtonDark: React.FC<{
  onClick: () => void;
  disabled?: boolean;
}> = ({ onClick, disabled }) => (
  <AsyncButton
    onClick={onClick}
    disabled={disabled}
    className={cx(rootStyles.button, styles.save)}
  >
    <FontAwesomeIcon icon={faSave} />
  </AsyncButton>
);

export default SaveButtonDark;
