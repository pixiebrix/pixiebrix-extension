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

import { useField } from "formik";
import React, { MouseEventHandler, useMemo, useState } from "react";
import { DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import AddElementAction from "./AddElementAction";
import ElementPreview from "./ElementPreview";
import { ROOT_ELEMENT_TYPES } from "@/components/documentBuilder/allowedElementTypes";
import cx from "classnames";
import previewStyles from "./ElementPreview.module.scss";
import documentTreeStyles from "@/components/documentBuilder/preview/documentTree.module.scss";
import styles from "./DocumentPreview.module.scss";
import { getPreviewValues } from "@/components/fields/fieldUtils";

type DocumentPreviewProps = {
  name: string;
  activeElement: string;
  setActiveElement: (activeElement: string) => void;
  menuBoundary?: Element;
};

const DocumentPreview = ({
  name,
  activeElement,
  setActiveElement,
  menuBoundary,
}: DocumentPreviewProps) => {
  const [{ value: body }] = useField<DocumentElement[]>(name);
  const bodyPreview = useMemo(() => getPreviewValues(body), [body]);

  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  const isHovered = hoveredElement === "body";

  const onClick: MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();

    setActiveElement(null);
  };

  const onMouseOver: MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
    setHoveredElement("body");
  };

  const onMouseLeave: MouseEventHandler<HTMLDivElement> = () => {
    setHoveredElement(null);
  };

  return (
    // eslint-disable-next-line jsx-a11y/mouse-events-have-key-events
    <div
      onClick={onClick}
      className={cx(
        styles.root,
        previewStyles.root,
        documentTreeStyles.container,
        {
          [previewStyles.hovered]: isHovered,
          [styles.empty]: body.length === 0,
        }
      )}
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
    >
      {bodyPreview.map((childElement, i) => (
        <ElementPreview
          key={`${name}.${i}`}
          elementName={`${name}.${i}`}
          previewElement={childElement}
          activeElement={activeElement}
          setActiveElement={setActiveElement}
          menuBoundary={menuBoundary}
          hoveredElement={hoveredElement}
          setHoveredElement={setHoveredElement}
        />
      ))}
      {body.length === 0 && <span className="text-muted">body</span>}
      <AddElementAction
        elementsCollectionName={name}
        allowedTypes={ROOT_ELEMENT_TYPES}
        className={previewStyles.addElement}
        menuBoundary={menuBoundary}
      />
    </div>
  );
};

export default DocumentPreview;
