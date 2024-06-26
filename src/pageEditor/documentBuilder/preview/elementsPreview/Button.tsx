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
  type ButtonElementConfig,
  type ButtonElement,
  type PreviewComponentProps,
} from "@/pageEditor/documentBuilder/documentBuilderTypes";
import cx from "classnames";
import documentTreeStyles from "@/pageEditor/documentBuilder/preview/documentTree.module.scss";
import Flaps from "@/pageEditor/documentBuilder/preview/flaps/Flaps";
import { Button as BsButton } from "react-bootstrap";

import { isExpression } from "@/utils/expressionUtils";

type ButtonProps = PreviewComponentProps & {
  element: ButtonElement;
  buttonProps: ButtonElementConfig;
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
  elementRef,
  ...restPreviewProps
}) => {
  // NOTE: not passing through "disabled" prop because that prevents the user from clicking the button in the preview
  // to select the element in the Document Builder.
  const {
    tooltip,
    variant,
    size,
    fullWidth,
    className: buttonClassName,
  } = buttonProps;

  return (
    <div>
      <div
        className={cx(className, documentTreeStyles.inlineWrapper)}
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
        <BsButton
          onClick={() => {}}
          // Not resolving expressions in Preview
          className={cx(
            isExpression(buttonClassName) ? undefined : buttonClassName,
            { "btn-block": fullWidth },
          )}
          variant={isExpression(variant) ? undefined : variant}
          size={isExpression(size) ? undefined : size}
          title={isExpression(tooltip) ? undefined : tooltip}
        >
          {children}
        </BsButton>
      </div>
    </div>
  );
};

export default Button;
