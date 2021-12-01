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
import React from "react";
import { DocumentElement } from "./documentBuilderTypes";
import AddElementAction from "./AddElementAction";
import ElementPreview from "./ElementPreview";
import { ROOT_ELEMENT_TYPES } from "./allowedElementTypes";
import cx from "classnames";

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

  return (
    <>
      {body.map((childElement, i) => (
        <ElementPreview
          key={`${name}.${i}`}
          elementName={`${name}.${i}`}
          activeElement={activeElement}
          setActiveElement={setActiveElement}
          menuBoundary={menuBoundary}
        />
      ))}
      <div className={cx({ "mt-3": body.length > 0 })}>
        <AddElementAction
          as="button"
          elementsCollectionName={name}
          allowedTypes={ROOT_ELEMENT_TYPES}
        />
      </div>
    </>
  );
};

export default DocumentPreview;
