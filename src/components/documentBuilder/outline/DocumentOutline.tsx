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

import { useField } from "formik";
import React from "react";
import { DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import ElementNode from "@/components/documentBuilder/outline/ElementNode";

type DocumentOutlineProps = {
  /**
   * Formik field name for the document body prop.
   */
  documentBodyName: string;
  activeElement: string;
  setActiveElement: (activeElement: string) => void;
};

const DocumentOutline = ({
  documentBodyName,
  activeElement,
  setActiveElement,
}: DocumentOutlineProps) => {
  const [{ value: body }] = useField<DocumentElement[]>(documentBodyName);

  return (
    <div>
      {body?.map((element, index) => (
        <ElementNode
          key={index}
          activeElement={activeElement}
          setActiveElement={setActiveElement}
          documentBodyName={documentBodyName}
          elementName={String(index)}
          level={1}
          element={element}
        />
      ))}
    </div>
  );
};

export default DocumentOutline;
