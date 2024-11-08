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

import { useField } from "formik";
import React, { type MutableRefObject } from "react";
import EllipsisMenu from "../../../components/ellipsisMenu/EllipsisMenu";
import {
  type DocumentBuilderElement,
  type DocumentBuilderElementType,
  DOCUMENT_BUILDER_ELEMENT_TYPES,
} from "../documentBuilderTypes";
import styles from "./AddElementAction.module.scss";
import { createNewDocumentBuilderElement } from "../createNewDocumentBuilderElement";
import documentBuilderElementTypeLabels from "../elementTypeLabels";
import cx from "classnames";

type AddElementActionProps = {
  /**
   * Formik field name for the collection to add the element to (including the path of the Document root)
   */
  elementsCollectionName: string;
  allowedTypes?: DocumentBuilderElementType[];
  className?: string;
  /**
   * Optional boundary for popover menu position calculations.
   * @see EllipsisMenu
   */
  boundingBoxRef?: MutableRefObject<HTMLElement | null>;
};

const AddElementAction: React.FC<AddElementActionProps> = ({
  elementsCollectionName,
  allowedTypes = DOCUMENT_BUILDER_ELEMENT_TYPES,
  className,
  boundingBoxRef,
}) => {
  const [{ value: elementsCollection }, , { setValue }] = useField<
    DocumentBuilderElement[]
  >(elementsCollectionName);

  const addElement = async (
    elementType: Parameters<typeof createNewDocumentBuilderElement>[0],
  ) => {
    const documentBuilderElement = createNewDocumentBuilderElement(elementType);
    await setValue([...elementsCollection, documentBuilderElement]);
  };

  const elementItems = allowedTypes.map((elementType) => ({
    // eslint-disable-next-line security/detect-object-injection -- type checked
    title: documentBuilderElementTypeLabels[elementType],
    async action() {
      await addElement(elementType);
    },
  }));

  // Extra pipeline items; can be added wherever a pipeline is allowed
  const pipelineItems = allowedTypes.includes("pipeline")
    ? [
        {
          title: "Form",
          async action() {
            await addElement("form");
          },
        },
      ]
    : [];

  return (
    <EllipsisMenu
      classNames={{ menuButton: cx(className, styles.ellipsisMenu) }}
      items={[...elementItems, ...pipelineItems]}
      boundingBoxRef={boundingBoxRef}
    />
  );
};

export default AddElementAction;
