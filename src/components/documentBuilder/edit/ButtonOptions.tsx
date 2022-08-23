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

import React, { useMemo } from "react";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import getElementEditSchemas from "@/components/documentBuilder/edit/getElementEditSchemas";
import PipelineOptions from "./PipelineOptions";

type ButtonOptionsProps = {
  elementName: string;
};

const ButtonOptions: React.FC<ButtonOptionsProps> = ({ elementName }) => {
  const schemaFields = useMemo(
    () =>
      getElementEditSchemas("button", elementName).map((schema) => (
        <SchemaField key={schema.name} {...schema} />
      )),
    [elementName]
  );

  return (
    <>
      <PipelineOptions elementName={elementName} />
      {schemaFields}
    </>
  );
};

export default ButtonOptions;
