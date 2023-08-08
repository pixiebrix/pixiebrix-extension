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

import { useField } from "formik";
import React from "react";
import EllipsisMenu from "@/components/ellipsisMenu/EllipsisMenu";
import {
  type DocumentElement,
  type DocumentElementType,
  DOCUMENT_ELEMENT_TYPES,
} from "@/components/documentBuilder/documentBuilderTypes";
import styles from "./AddElementAction.module.scss";
import { createNewElement } from "@/components/documentBuilder/createNewElement";
import elementTypeLabels from "@/components/documentBuilder/elementTypeLabels";

type AddElementActionProps = {
  /**
   * Formik field name for the collection to add the element to (including the path of the Document root)
   */
  elementsCollectionName: string;
  allowedTypes?: DocumentElementType[];
  className?: string;
  menuBoundary?: Element;
};

const AddElementAction: React.FC<AddElementActionProps> = ({
  elementsCollectionName,
  allowedTypes = DOCUMENT_ELEMENT_TYPES,
  className,
  menuBoundary,
}) => {
  const [{ value: elementsCollection }, , { setValue }] = useField<
    DocumentElement[]
  >(elementsCollectionName);

  const addElement = async (
    elementType: Parameters<typeof createNewElement>[0]
  ) => {
    const element = createNewElement(elementType);
    await setValue([...elementsCollection, element]);
  };

  const elementItems = allowedTypes.map((elementType) => ({
    // eslint-disable-next-line security/detect-object-injection -- type checked
    title: elementTypeLabels[elementType],
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
      className={className}
      toggleClassName={styles.toggle}
      items={[...elementItems, ...pipelineItems]}
      menuBoundary={menuBoundary}
    />
  );
};

export default AddElementAction;
