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
import { type DocumentBuilderElement } from "@/pageEditor/documentBuilder/documentBuilderTypes";
import RemoveElement from "./RemoveElement";
import MoveElement from "./MoveElement";
import documentBuilderElementTypeLabels from "@/pageEditor/documentBuilder/elementTypeLabels";
import useElementOptions from "@/pageEditor/documentBuilder/edit/useElementOptions";
import { useSelector } from "react-redux";
import { selectActiveBuilderPreviewElement } from "@/pageEditor/store/editor/editorSelectors";
import { getProperty } from "@/utils/objectUtils";
import ConnectedCollapsibleFieldSection from "@/pageEditor/fields/ConnectedCollapsibleFieldSection";
import { joinName } from "@/utils/formUtils";
import CssSpacingField from "@/components/fields/schemaFields/CssSpacingField";
import { assertNotNullish } from "@/utils/nullishUtils";

type ElementEditorProps = {
  documentBodyName: string;
};

const ElementEditor: React.FC<ElementEditorProps> = ({ documentBodyName }) => {
  const activeElement = useSelector(selectActiveBuilderPreviewElement);
  assertNotNullish(activeElement, "Expected activeElement");

  const elementName = `${documentBodyName}.${activeElement}`;

  const [{ value: documentBuilderElement }] = useField<
    DocumentBuilderElement | undefined
  >(elementName);

  assertNotNullish(
    documentBuilderElement,
    `documentBuilderElement not found: ${elementName}`,
  );

  const ElementOptions = useElementOptions(documentBuilderElement, elementName);

  const currentElementName: string =
    getProperty(
      documentBuilderElementTypeLabels,
      documentBuilderElement.type,
    ) ?? "Unknown";

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
