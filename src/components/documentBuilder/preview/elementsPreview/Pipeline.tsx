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
import elementTypeLabels from "@/components/documentBuilder/elementTypeLabels";
import cx from "classnames";
import documentTreeStyles from "@/components/documentBuilder/preview/documentTree.module.scss";
import Flaps from "@/components/documentBuilder/preview/flaps/Flaps";
import { PipelineExpression } from "@/runtime/mapArgs";

type PipelineProps = PreviewComponentProps & {
  element: DocumentElement;
};

const Pipeline: React.FunctionComponent<PipelineProps> = ({
  element,
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
      elementType={element.type}
      documentBodyName={documentBodyName}
      elementName={elementName}
      isHovered={isHovered}
      isActive={isActive}
    />
    <h3>{elementTypeLabels.pipeline}</h3>
    {(element.config?.pipeline as PipelineExpression)?.__value__.map(
      ({ id }) => (
        <p key={id}>{id}</p>
      )
    )}
  </div>
);

export default Pipeline;
