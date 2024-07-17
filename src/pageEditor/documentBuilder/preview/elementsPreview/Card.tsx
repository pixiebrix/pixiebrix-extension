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

import React from "react";
import {
  type DocumentBuilderComponent,
  type DocumentBuilderElement,
  type PreviewComponentProps,
} from "@/pageEditor/documentBuilder/documentBuilderTypes";
import cx from "classnames";
import documentTreeStyles from "@/pageEditor/documentBuilder/preview/documentTree.module.scss";
import Flaps from "@/pageEditor/documentBuilder/preview/flaps/Flaps";
import styles from "./Card.module.scss";

type CardProps = PreviewComponentProps & {
  element: DocumentBuilderElement;
  documentBuilderComponent: DocumentBuilderComponent;
};

const Card: React.FunctionComponent<CardProps> = ({
  element,
  documentBuilderComponent: { Component, props },
  children,
  className,
  isHovered,
  isActive,
  documentBodyName,
  elementName,
  elementRef,
  ...restPreviewProps
}) => {
  const { bodyClassName, ...restCardProps } = props ?? {};
  return (
    <div
      className={cx(documentTreeStyles.shiftRightWrapper, className)}
      {...restPreviewProps}
      ref={elementRef}
    >
      <Flaps
        className={documentTreeStyles.flapShiftRight}
        elementType={element.type}
        documentBodyName={documentBodyName}
        elementName={elementName}
        isHovered={isHovered}
        isActive={isActive}
      />
      <Component
        {...restCardProps}
        bodyClassName={cx(bodyClassName ?? "", styles.cardBody)}
      >
        {children}
      </Component>
    </div>
  );
};

export default Card;
