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

import {
  DocumentElement,
  isButtonElement,
  isListElement,
  isPipelineElement,
} from "@/components/documentBuilder/documentBuilderTypes";
import React, { useMemo } from "react";
import ListOptions from "@/components/documentBuilder/edit/ListOptions";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import getElementEditSchemas from "@/components/documentBuilder/edit/getElementEditSchemas";
import PipelineOptions from "@/components/documentBuilder/edit/PipelineOptions";
import ButtonOptions from "@/components/documentBuilder/edit/ButtonOptions";

const useElementOptions = (
  element: DocumentElement,
  elementName: string
): React.FC => {
  const elementType = element.type;

  const ElementOptions = useMemo(() => {
    if (isListElement(element)) {
      const ListOptionsFields = () => <ListOptions elementName={elementName} />;
      return ListOptionsFields;
    }

    if (isPipelineElement(element)) {
      const PipelineOptionsFields = () => (
        <PipelineOptions elementName={elementName} />
      );
      return PipelineOptionsFields;
    }

    if (isButtonElement(element)) {
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
  }, [elementType, elementName]);

  return ElementOptions;
};

export default useElementOptions;
