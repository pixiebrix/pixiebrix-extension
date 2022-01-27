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
import styles from "./LinkButton.module.scss";
import React from "react";
import { Button, ButtonProps } from "react-bootstrap";
import cx from "classnames";
import { Except } from "type-fest";

type PropType = Except<ButtonProps, "variant" | "size" | "href" | "target">;

/** A button that looks like plain text. The right alternative to fake links like `<a href="#">` */
export const LinkButton: React.FC<PropType> = (props: PropType) => {
  const { className, ...otherProps } = props;
  return (
    <Button
      variant="link"
      className={cx(styles.root, className)}
      {...otherProps}
    />
  );
};
