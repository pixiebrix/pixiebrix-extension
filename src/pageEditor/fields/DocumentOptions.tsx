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
import useReduxState from "@/hooks/useReduxState";
import { DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import ConfigErrorBoundary from "@/pageEditor/fields/ConfigErrorBoundary";
import { selectNodePreviewActiveElement } from "@/pageEditor/uiState/uiState";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";

export const DOCUMENT_ID = validateRegistryId("@pixiebrix/document");

const DocumentOptions: React.FC<{
  name: string;
  configKey: string;
}> = ({ name, configKey }) => {
  const [activeElement, setActiveElement] = useReduxState(
    selectNodePreviewActiveElement,
    editorActions.setNodePreviewActiveElement
  );

  const bodyName = joinName(name, configKey, "body");
  const [{ value }, , { setValue }] = useField<DocumentElement[]>(bodyName);

  useEffect(() => {
    if (!Array.isArray(value)) {
      setValue([]);
    }
  }, [value]);

  return (
    <ConfigErrorBoundary>
      <DocumentEditor
        activeElement={activeElement}
        setActiveElement={setActiveElement}
      />
    </ConfigErrorBoundary>
  );
};

export default DocumentOptions;
