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
} from "../../documentBuilderTypes";
import cx from "classnames";
import documentTreeStyles from "../documentTree.module.scss";
import Flaps from "../flaps/Flaps";
import documentBuilderElementTypeLabels from "../../elementTypeLabels";

type ContainerProps = PreviewComponentProps & {
  element: DocumentBuilderElement;
  documentBuilderComponent: DocumentBuilderComponent;
};

const Container: React.FunctionComponent<
  React.PropsWithChildren<ContainerProps>
> = ({
  element,
  documentBuilderComponent: { Component, props },
  children,
  className,
  documentBodyName,
  elementName,
  isHovered,
  isActive,
  elementRef,
  ...restPreviewProps
}) => (
  <Component
    {...restPreviewProps}
    className={cx(
      props.className ?? "",
      className,
      documentTreeStyles.container,
    )}
    ref={elementRef}
  >
    <Flaps
      className={documentTreeStyles.flapShiftUp}
      elementType={element.type}
      documentBodyName={documentBodyName}
      elementName={elementName}
      isHovered={isHovered}
      isActive={isActive}
    />
    {!element.children?.length && (
      <span className="text-muted">
        {documentBuilderElementTypeLabels[element.type]}
      </span>
    )}
    {children}
  </Component>
);
export default Container;
