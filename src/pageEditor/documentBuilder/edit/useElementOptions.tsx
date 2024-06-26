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

import {
  type DocumentBuilderElement,
  isButtonElement,
  isListElement,
  isPipelineElement,
} from "@/pageEditor/documentBuilder/documentBuilderTypes";
import React, { useMemo } from "react";
import ListOptions from "@/pageEditor/documentBuilder/edit/ListOptions";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import getElementEditSchemas from "@/pageEditor/documentBuilder/edit/getElementEditSchemas";
import PipelineOptions from "@/pageEditor/documentBuilder/edit/PipelineOptions";
import ButtonOptions from "@/pageEditor/documentBuilder/edit/ButtonOptions";

const useElementOptions = (
  documentBuilderElement: DocumentBuilderElement,
  elementName: string,
): React.FC => {
  const elementType = documentBuilderElement.type;

  const ElementOptions = useMemo(
    () => {
      if (isListElement(documentBuilderElement)) {
        const ListOptionsFields = () => (
          <ListOptions elementName={elementName} />
        );
        return ListOptionsFields;
      }

      if (isPipelineElement(documentBuilderElement)) {
        const PipelineOptionsFields = () => (
          <PipelineOptions elementName={elementName} />
        );
        return PipelineOptionsFields;
      }

      if (isButtonElement(documentBuilderElement)) {
        const ButtonOptionsFields = () => (
          <ButtonOptions elementName={elementName} />
        );

        return ButtonOptionsFields;
      }

      const editSchemas = getElementEditSchemas(elementType, elementName);
      const OptionsFields: React.FC = () => (
        <>
          {editSchemas.map((editSchema) => (
            <SchemaField key={editSchema.name} {...editSchema} />
          ))}
        </>
      );

      return OptionsFields;
    },
    // The element type can't change, so this is OK
    // eslint-disable-next-line react-hooks/exhaustive-deps -- leaving element off to prevent remounting
    [elementType, elementName],
  );

  return ElementOptions;
};

export default useElementOptions;
