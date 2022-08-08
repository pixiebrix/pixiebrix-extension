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
import { UnknownObject } from "@/types";
import { Button as BsButton } from "react-bootstrap";

type ButtonProps = PreviewComponentProps & {
  element: DocumentElement;
  buttonProps: UnknownObject;
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
  // Destructure disabled and onClick from button props.
  // If the button is disabled in the preview the user can't select it
  // to configure the button
  const { title, onClick, disabled, ...restButtonProps } = buttonProps;
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
        <BsButton onClick={() => {}} {...restButtonProps}>
          {title}
        </BsButton>
      </div>
    </div>
  );
};

export default Button;
