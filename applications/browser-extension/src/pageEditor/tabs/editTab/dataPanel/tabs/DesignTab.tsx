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

import DataTabPane from "../DataTabPane";
import { DataPanelTabKey } from "../dataPanelTypes";
import Alert from "@/components/Alert";
import FormPreview from "@/components/formBuilder/preview/FormPreview";
import type { RJSFSchema } from "@/components/formBuilder/formBuilderTypes";
import DocumentPreview from "../../../../documentBuilder/preview/DocumentPreview";
import React, { type MutableRefObject } from "react";
import useReduxState from "@/hooks/useReduxState";
import {
  selectActiveBuilderPreviewElement,
  selectActiveNodeInfo,
} from "../../../../store/editor/editorSelectors";
import { actions as editorActions } from "../../../../store/editor/editorSlice";
import { joinPathParts } from "../../../../../utils/formUtils";
import { useSelector } from "react-redux";
import { CustomFormRenderer } from "@/bricks/renderers/customForm";
import { FormTransformer } from "@/bricks/transformers/ephemeralForm/formTransformer";
import { DocumentRenderer } from "@/bricks/renderers/document";
import { type RegistryId } from "../../../../../types/registryTypes";
import useIsSidebarPanelStale from "./useIsSidebarPanelStale";

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
 * @since 2.0.7 split out into a separate component
 */
const DesignTab: React.FC<{
  /**
   * Boundary for popover menu position calculations.
   * @see EllipsisMenu
   */
  boundingBoxRef: MutableRefObject<HTMLElement | null>;
}> = ({ boundingBoxRef }) => {
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

  const documentBodyFieldName = joinPathParts(brickPath, "config.body");

  const showFormDesign = shouldShowFormDesign(brickId);

  return (
    <DataTabPane eventKey={DataPanelTabKey.Design}>
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
          boundingBoxRef={boundingBoxRef}
        />
      )}
    </DataTabPane>
  );
};

export default DesignTab;
