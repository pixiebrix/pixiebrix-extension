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

import React, { MouseEventHandler } from "react";
import styles from "./ElementPreview.module.scss";
import cx from "classnames";
import { DocumentElement } from "./documentBuilderTypes";
import { getPreviewComponentDefinition } from "./documentTree";
import AddElementAction from "./AddElementAction";
import { useField } from "formik";
import { getAllowedChildTypes } from "./allowedElementTypes";

interface ElementPreviewTemplateProps {
  elementName: string;
  activeElement: string;
  setActiveElement: (name: string) => void;
  menuBoundary?: Element;
}

const ElementPreview: React.FC<ElementPreviewTemplateProps> = ({
  elementName,
  activeElement,
  setActiveElement,
  menuBoundary,
}) => {
  const [{ value: documentElement }] = useField<DocumentElement>(elementName);
  const isActive = activeElement === elementName;
  const onClick: MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();

    if (!isActive) {
      setActiveElement(elementName);
    }
  };

  const isContainer = Array.isArray(documentElement.children);

  const { Component: PreviewComponent, props } = getPreviewComponentDefinition(
    documentElement
  );

  return (
    <PreviewComponent
      {...props}
      onClick={onClick}
      className={cx(props?.className, styles.root, {
        [styles.active]: isActive,
      })}
    >
      {props?.children}
      {isContainer &&
        documentElement.children.map((childElement, i) => (
          <ElementPreview
            key={`${elementName}.children.${i}`}
            elementName={`${elementName}.children.${i}`}
            activeElement={activeElement}
            setActiveElement={setActiveElement}
            menuBoundary={menuBoundary}
          />
        ))}
      {isContainer && (
        <AddElementAction
          as="ellipsis"
          elementsCollectionName={`${elementName}.children`}
          allowedTypes={getAllowedChildTypes(documentElement)}
          className={styles.addElement}
          menuBoundary={menuBoundary}
        />
      )}
    </PreviewComponent>
  );
};

export default ElementPreview;
