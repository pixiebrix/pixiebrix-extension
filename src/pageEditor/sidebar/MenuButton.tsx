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
import rootStyles from "./ActionButtons.module.scss";
import styles from "./MenuButton.module.scss";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisH } from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";

export type MenuButtonProps = {
  onClick: () => void;
  ref?: React.ForwardedRef<HTMLButtonElement>;
};

const MenuButton: React.FC<MenuButtonProps> = ({ onClick, ref }) => (
  <Button
    onClick={onClick}
    ref={ref}
    className={cx(rootStyles.button, styles.menu)}
  >
    <FontAwesomeIcon icon={faEllipsisH} fixedWidth />
  </Button>
);

export default MenuButton;
