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
import React from "react";
import { type DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import RemoveElement from "./RemoveElement";
import MoveElement from "./MoveElement";
import elementTypeLabels from "@/components/documentBuilder/elementTypeLabels";
import useElementOptions from "@/components/documentBuilder/edit/useElementOptions";
import { useSelector } from "react-redux";
import { selectNodePreviewActiveElement } from "@/pageEditor/slices/editorSelectors";
import { getProperty } from "@/utils/objectUtils";
import ConnectedCollapsibleFieldSection from "@/pageEditor/fields/ConnectedCollapsibleFieldSection";
import { joinName } from "@/utils/formUtils";
import CssSpacingField from "@/components/fields/schemaFields/CssSpacingField";

type ElementEditorProps = {
  documentBodyName: string;
};

const ElementEditor: React.FC<ElementEditorProps> = ({ documentBodyName }) => {
  const activeElement = useSelector(selectNodePreviewActiveElement);
  const elementName = `${documentBodyName}.${activeElement}`;
  const [{ value: documentElement }] = useField<DocumentElement>(elementName);
  const ElementOptions = useElementOptions(documentElement, elementName);

  const currentElementName: string =
    getProperty(elementTypeLabels, documentElement.type) ?? "Unknown";

  return (
    <>
      <ConnectedCollapsibleFieldSection
        title="Document Elements"
        initialExpanded
      >
        <p className="small text-muted">
          Use the Preview Tab on the right to select an element to edit ⟶
        </p>
        <p>
          <RemoveElement documentBodyName={documentBodyName} />
        </p>

        <h6>Current element: {currentElementName}</h6>

        <ElementOptions />
        <MoveElement documentBodyName={documentBodyName} />
      </ConnectedCollapsibleFieldSection>
      <ConnectedCollapsibleFieldSection title="Advanced: Layout">
        <CssSpacingField
          name={joinName(elementName, "config", "className")}
          schema={{ type: "string" }}
          label="Spacing"
        />
      </ConnectedCollapsibleFieldSection>
    </>
  );
};

export default ElementEditor;
