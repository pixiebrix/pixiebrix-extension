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
  type DocumentBuilderElement,
  type PreviewComponentProps,
} from "../../documentBuilderTypes";
import documentBuilderElementTypeLabels from "../../elementTypeLabels";
import cx from "classnames";
import documentTreeStyles from "../documentTree.module.scss";
import Flaps from "../flaps/Flaps";
import { type PipelineExpression } from "../../../../types/runtimeTypes";

type PipelineProps = PreviewComponentProps & {
  element: DocumentBuilderElement;
};

const Pipeline: React.FunctionComponent<
  React.PropsWithChildren<PipelineProps>
> = ({
  element,
  children,
  className,
  documentBodyName,
  elementName,
  isHovered,
  isActive,
  elementRef,
  ...restPreviewProps
}) => (
  <div
    className={cx(documentTreeStyles.shiftRightWrapper, className)}
    ref={elementRef}
    {...restPreviewProps}
  >
    <Flaps
      className={documentTreeStyles.flapShiftRight}
      elementType={element.type}
      documentBodyName={documentBodyName}
      elementName={elementName}
      isHovered={isHovered}
      isActive={isActive}
    />
    <h3>{documentBuilderElementTypeLabels.pipeline}</h3>
    {(element.config?.pipeline as PipelineExpression)?.__value__.map(
      ({ id }) => <p key={id}>{id}</p>,
    )}
  </div>
);

export default Pipeline;
