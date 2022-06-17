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
import { isValidUrl } from "@/utils";
import ImagePlaceholder from "@/components/imagePlaceholder/ImagePlaceholder";
import { isEmpty } from "lodash";
import PopupLabels from "./PopupLabels";

type ImageProps = PreviewComponentProps & {
  elementType: DocumentElementType;
  documentComponent: DocumentComponent;
};

const Image: React.FunctionComponent<ImageProps> = ({
  elementType,
  documentComponent: { Component, props },
  children,
  className,
  documentBodyName,
  elementName,
  isHovered,
  isActive,
  ...restPreviewProps
}) => {
  // If it's not a valid URL, show a placeholder
  const renderPlaceholder =
    typeof props.src !== "string" ||
    !isValidUrl(props.src, { protocols: ["https:"] });

  return (
    <div
      className={cx(documentTreeStyles.imageWrapper, className)}
      {...restPreviewProps}
    >
      <PopupLabels
        className={documentTreeStyles.labelShiftRight}
        elementType={elementType}
        documentBodyName={documentBodyName}
        elementName={elementName}
        isHovered={isHovered}
        isActive={isActive}
      />
      {renderPlaceholder ? (
        <ImagePlaceholder
          height={isEmpty(props.height) ? "50" : (props.height as number)}
          width={isEmpty(props.width) ? "100" : (props.width as number)}
        />
      ) : (
        <Component {...props} />
      )}
    </div>
  );
};

export default Image;
