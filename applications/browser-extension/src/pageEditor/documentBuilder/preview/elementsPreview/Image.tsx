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
  type DocumentBuilderElementType,
  type PreviewComponentProps,
} from "../../documentBuilderTypes";
import cx from "classnames";
import documentTreeStyles from "../documentTree.module.scss";
import ImagePlaceholder from "@/components/imagePlaceholder/ImagePlaceholder";
import { isEmpty } from "lodash";
import Flaps from "../flaps/Flaps";
import { canParseUrl } from "../../../../utils/urlUtils";

type ImageProps = PreviewComponentProps & {
  elementType: DocumentBuilderElementType;
  documentBuilderComponent: DocumentBuilderComponent;
};

const Image: React.FunctionComponent<React.PropsWithChildren<ImageProps>> = ({
  elementType,
  documentBuilderComponent: { Component, props },
  children,
  className,
  documentBodyName,
  elementName,
  isHovered,
  isActive,
  elementRef,
  ...restPreviewProps
}) => {
  // If it's not a valid URL, show a placeholder
  const renderPlaceholder =
    !canParseUrl(props.src) || !props.src.startsWith("https://");

  return (
    <div
      className={cx(documentTreeStyles.imageWrapper, className)}
      {...restPreviewProps}
      ref={elementRef}
    >
      <Flaps
        className={documentTreeStyles.flapShiftRight}
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
