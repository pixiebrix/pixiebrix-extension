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

import DataTabPane from "@/pageEditor/tabs/editTab/dataPanel/DataTabPane";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import Alert from "@/components/Alert";
import FormPreview from "@/components/formBuilder/preview/FormPreview";
import type { RJSFSchema } from "@/components/formBuilder/formBuilderTypes";
import DocumentPreview from "@/pageEditor/documentBuilder/preview/DocumentPreview";
import React, { useRef } from "react";
import useReduxState from "@/hooks/useReduxState";
import {
  selectActiveBuilderPreviewElement,
  selectActiveNodeInfo,
} from "@/pageEditor/store/editor/editorSelectors";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { joinPathParts } from "@/utils/formUtils";
import { useSelector } from "react-redux";
import { CustomFormRenderer } from "@/bricks/renderers/customForm";
import { FormTransformer } from "@/bricks/transformers/ephemeralForm/formTransformer";
import { DocumentRenderer } from "@/bricks/renderers/document";
import { type RegistryId } from "@/types/registryTypes";
import useIsSidebarPanelStale from "@/pageEditor/tabs/editTab/dataPanel/tabs/useIsSidebarPanelStale";

/**
 * Return true if the brick uses the Form Builder
 */
export function shouldShowFormDesign(brickId: RegistryId): boolean {
  return [CustomFormRenderer.BRICK_ID, FormTransformer.BRICK_ID].includes(
    brickId,
  );
}

/**
 * Return true if the brick uses the Document Builder
 */
export function shouldShowDocumentDesign(brickId: RegistryId): boolean {
  return brickId === DocumentRenderer.BRICK_ID;
}

export const staleSidePanelAlertElement = (
  <Alert variant="info">
    The Sidebar Panel is out of sync with the panel configuration
  </Alert>
);

/**
 * The Form/Document Design tab in the Data Panel.
 * @since 2.0.6 split out into a separate component
 */
const DesignTab: React.FC = () => {
  const {
    blockId: brickId,
    blockConfig: brickConfig,
    path: brickPath,
  } = useSelector(selectActiveNodeInfo);
  const isSidebarPanelStale = useIsSidebarPanelStale();

  const [activeBuilderPreviewElement, setActiveBuilderPreviewElement] =
    useReduxState(
      selectActiveBuilderPreviewElement,
      editorActions.setActiveBuilderPreviewElement,
    );

  const popupBoundaryRef = useRef<HTMLElement | null>(null);

  const documentBodyFieldName = joinPathParts(brickPath, "config.body");

  const showFormDesign = shouldShowFormDesign(brickId);

  return (
    <DataTabPane
      eventKey={DataPanelTabKey.Design}
      ref={(element: HTMLDivElement) => {
        popupBoundaryRef.current = element;
      }}
    >
      {isSidebarPanelStale && staleSidePanelAlertElement}
      {showFormDesign ? (
        <FormPreview
          rjsfSchema={brickConfig?.config as RJSFSchema}
          activeField={activeBuilderPreviewElement}
          setActiveField={setActiveBuilderPreviewElement}
        />
      ) : (
        <DocumentPreview
          documentBodyName={documentBodyFieldName}
          activeElement={activeBuilderPreviewElement}
          setActiveElement={setActiveBuilderPreviewElement}
          boundingBoxRef={popupBoundaryRef}
        />
      )}
    </DataTabPane>
  );
};

export default DesignTab;
