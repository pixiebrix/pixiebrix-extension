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
import {
  DocumentComponent,
  DocumentElementType,
  PreviewComponentProps,
} from "@/components/documentBuilder/documentBuilderTypes";
import cx from "classnames";
import documentTreeStyles from "@/components/documentBuilder/preview/documentTree.module.scss";
import Flaps from "@/components/documentBuilder/preview/flaps/Flaps";

type BasicProps = PreviewComponentProps & {
  elementType: DocumentElementType;
  documentComponent: DocumentComponent;
};

const Basic: React.FunctionComponent<BasicProps> = ({
  elementType,
  documentComponent: { Component, props },
  children,
  className,
  documentBodyName,
  elementName,
  isHovered,
  isActive,
  ...restPreviewProps
}) => (
  <div
    className={cx(documentTreeStyles.shiftRightWrapper, className)}
    {...restPreviewProps}
  >
    <Flaps
      className={documentTreeStyles.flapShiftRight}
      elementType={elementType}
      documentBodyName={documentBodyName}
      elementName={elementName}
      isHovered={isHovered}
      isActive={isActive}
    />
    <Component {...props} />
  </div>
);

export default Basic;
