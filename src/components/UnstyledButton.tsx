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

import styles from "./UnstyledButton.module.scss";
import React from "react";
import cx from "classnames";

type PropType = React.HTMLAttributes<HTMLButtonElement>;

/**
 * A button without any native style. The right starting point
 * for any button with completely custom styles, without having
 * to reset the native style every time.
 */
export const UnstyledButton: React.FC<PropType> = ({
  className,
  ...otherProps
}: PropType) => (
  <button className={cx(styles.root, className)} {...otherProps} />
);
