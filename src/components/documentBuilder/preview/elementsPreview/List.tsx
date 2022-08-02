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
  DocumentElement,
  PreviewComponentProps,
} from "@/components/documentBuilder/documentBuilderTypes";
import cx from "classnames";
import documentTreeStyles from "@/components/documentBuilder/preview/documentTree.module.scss";
import Flaps from "@/components/documentBuilder/preview/flaps/Flaps";
import { isExpression } from "@/runtime/mapArgs";

type ListProps = PreviewComponentProps & {
  element: DocumentElement;
};

const List: React.FunctionComponent<ListProps> = ({
  element,
  children,
  className,
  documentBodyName,
  elementName,
  isHovered,
  isActive,
  ...restPreviewProps
}) => {
  const { config = {}, type } = element;
  const { array, elementKey } = config;
  const arrayValue = isExpression(array) ? array.__value__ : String(array);

  return (
    <div
      className={cx(
        className,
        documentTreeStyles.container,
        documentTreeStyles.listContainer
      )}
      {...restPreviewProps}
    >
      <Flaps
        className={documentTreeStyles.flapShiftUp}
        elementType={type}
        documentBodyName={documentBodyName}
        elementName={elementName}
        isHovered={isHovered}
        isActive={isActive}
      />
      <div className="text-muted">List: {arrayValue}</div>
      <div className="text-muted">Element key: @{elementKey || "element"}</div>
      {children}
    </div>
  );
};

export default List;
