/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { MouseEventHandler, useMemo } from "react";
import styles from "./ElementPreview.module.scss";
import cx from "classnames";
import {
  DocumentElement,
  isListElement,
} from "@/components/documentBuilder/documentBuilderTypes";
import AddElementAction from "./AddElementAction";
import { getAllowedChildTypes } from "@/components/documentBuilder/allowedElementTypes";
import getPreviewComponentDefinition from "./getPreviewComponentDefinition";

export type ElementPreviewProps = {
  elementName: string;
  // An element config having all expressions unwrapped, different from what is stored in Formik
  previewElement: DocumentElement;
  activeElement: string | null;
  setActiveElement: (name: string | null) => void;
  hoveredElement: string | null;
  setHoveredElement: (name: string | null) => void;
  menuBoundary?: Element;
};

const ElementPreview: React.FC<ElementPreviewProps> = ({
  elementName,
  previewElement,
  activeElement,
  setActiveElement,
  hoveredElement,
  setHoveredElement,
  menuBoundary,
}) => {
  const isActive = activeElement === elementName;
  const isHovered = hoveredElement === elementName && !isActive;
  const onClick: MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();

    if (!isActive) {
      setActiveElement(elementName);
    }
  };

  const onMouseOver: MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
    if (hoveredElement !== elementName) {
      setHoveredElement(elementName);
    }
  };

  const onMouseLeave: MouseEventHandler<HTMLDivElement> = () => {
    if (hoveredElement === elementName) {
      setHoveredElement(null);
    }
  };

  // Render children and Add Menu for the container element
  const isContainer = Array.isArray(previewElement.children);

  // Render the item template and the Item Type Selector for the list element
  const isList = isListElement(previewElement);

  const { Component: PreviewComponent, props } = useMemo(
    () => getPreviewComponentDefinition(previewElement),
    [previewElement]
  );

  return (
    <PreviewComponent
      {...props}
      onClick={onClick}
      className={cx(props?.className, styles.root, {
        [styles.active]: isActive,
        [styles.hovered]: isHovered,
      })}
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
    >
      {props?.children}
      {isContainer &&
        previewElement.children.map((childElement, i) => (
          <ElementPreview
            key={`${elementName}.children.${i}`}
            elementName={`${elementName}.children.${i}`}
            previewElement={childElement}
            activeElement={activeElement}
            setActiveElement={setActiveElement}
            menuBoundary={menuBoundary}
            hoveredElement={hoveredElement}
            setHoveredElement={setHoveredElement}
          />
        ))}
      {isContainer && (
        <AddElementAction
          elementsCollectionName={`${elementName}.children`}
          allowedTypes={getAllowedChildTypes(previewElement)}
          className={styles.addElement}
          menuBoundary={menuBoundary}
        />
      )}
      {isList && (
        <ElementPreview
          elementName={`${elementName}.config.element.__value__`}
          previewElement={previewElement.config.element.__value__}
          activeElement={activeElement}
          setActiveElement={setActiveElement}
          menuBoundary={menuBoundary}
          hoveredElement={hoveredElement}
          setHoveredElement={setHoveredElement}
        />
      )}
    </PreviewComponent>
  );
};

export default ElementPreview;
