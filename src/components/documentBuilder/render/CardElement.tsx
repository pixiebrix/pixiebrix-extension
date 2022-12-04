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
import { Card, type CardProps } from "react-bootstrap";
import cx from "classnames";

type CardElementProps = CardProps & {
  heading: string;

  // The bodyClassName is for internal use,
  // it allows to set CSS class needed in preview to the body
  bodyClassName?: string;
};

const CardElement: React.FunctionComponent<CardElementProps> = ({
  heading,
  children,
  bodyClassName,
  ...cardProps
}) => (
  <Card {...cardProps}>
    <Card.Header>{heading}</Card.Header>
    <Card.Body className={cx(bodyClassName, "overflow-auto")}>
      {children}
    </Card.Body>
  </Card>
);

export default CardElement;
