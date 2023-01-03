/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
  type ButtonDocumentConfig,
  type ButtonDocumentElement,
  type PreviewComponentProps,
} from "@/components/documentBuilder/documentBuilderTypes";
import cx from "classnames";
import documentTreeStyles from "@/components/documentBuilder/preview/documentTree.module.scss";
import Flaps from "@/components/documentBuilder/preview/flaps/Flaps";
import { Button as BsButton } from "react-bootstrap";
import { isExpression } from "@/runtime/mapArgs";

type ButtonProps = PreviewComponentProps & {
  element: ButtonDocumentElement;
  buttonProps: ButtonDocumentConfig;
};

const Button: React.FunctionComponent<ButtonProps> = ({
  element,
  children,
  className,
  documentBodyName,
  elementName,
  isHovered,
  isActive,
  buttonProps,
  ...restPreviewProps
}) => {
  const { title, variant, size, className: buttonClassName } = buttonProps;
  return (
    <div>
      <div
        className={cx(className, documentTreeStyles.inlineWrapper)}
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
        <BsButton
          onClick={() => {}}
          // Not resolving expressions in Preview
          className={
            isExpression(buttonClassName) ? undefined : buttonClassName
          }
          variant={isExpression(variant) ? undefined : variant}
          size={isExpression(size) ? undefined : size}
        >
          {title}
        </BsButton>
      </div>
    </div>
  );
};

export default Button;
