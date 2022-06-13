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
  PreviewComponentProps,
} from "@/components/documentBuilder/documentBuilderTypes";
import cx from "classnames";
import documentTreeStyles from "@/components/documentBuilder/preview/documentTree.module.scss";

type BasicProps = PreviewComponentProps & {
  previewDocumentComponent: DocumentComponent;
};

const Basic: React.FunctionComponent<BasicProps> = ({
  previewDocumentComponent: { Component, props },
  children,
  className,
  isHovered,
  isActive,
  onSelectParent,
  ...restPreviewProps
}) => (
  <div
    className={cx(documentTreeStyles.wrapperShiftRight, className)}
    {...restPreviewProps}
  >
    <Component {...props} />
  </div>
);

export default Basic;
