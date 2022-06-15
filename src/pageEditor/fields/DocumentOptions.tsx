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

import React, { useEffect } from "react";
import { validateRegistryId } from "@/types/helpers";
import { joinName } from "@/utils";
import { useField } from "formik";
import DocumentEditor from "@/components/documentBuilder/edit/DocumentEditor";
import { DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import ConfigErrorBoundary from "@/pageEditor/fields/ConfigErrorBoundary";

export const DOCUMENT_ID = validateRegistryId("@pixiebrix/document");

const DocumentOptions: React.FC<{
  name: string;
  configKey: string;
}> = ({ name, configKey }) => {
  const documentBodyName = joinName(name, configKey, "body");
  const [{ value }, , { setValue }] =
    useField<DocumentElement[]>(documentBodyName);

  useEffect(() => {
    if (!Array.isArray(value)) {
      setValue([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- exclude setValue because reference changes on render
  }, [value]);

  return (
    <ConfigErrorBoundary>
      <DocumentEditor documentBodyName={documentBodyName} />
    </ConfigErrorBoundary>
  );
};

export default DocumentOptions;
