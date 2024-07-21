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
import React, { useMemo } from "react";
import useReduxState from "@/hooks/useReduxState";
import {
  selectActiveBuilderPreviewElement,
  selectActiveModComponentFormState,
  selectActiveNodeInfo,
} from "@/pageEditor/store/editor/editorSelectors";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import dataPanelStyles from "@/pageEditor/tabs/dataPanelTabs.module.scss";
import { StarterBrickTypes } from "@/types/starterBrickTypes";
import { isEqual, omit } from "lodash";
import { joinPathParts } from "@/utils/formUtils";
import { useSelector } from "react-redux";
import { CustomFormRenderer } from "@/bricks/renderers/customForm";
import { FormTransformer } from "@/bricks/transformers/ephemeralForm/formTransformer";
import { DocumentRenderer } from "@/bricks/renderers/document";
import { type RegistryId } from "@/types/registryTypes";
import useBrickTraceRecord from "@/pageEditor/tabs/editTab/dataPanel/tabs/useBrickTraceRecord";

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

/**
 * Return true if the rendered Sidebar Panel might be out of sync with the configuration.
 */
export function useIsRenderedPanelStale(): boolean {
  const { blockConfig: brickConfig } = useSelector(selectActiveNodeInfo);

  const { traceRecord } = useBrickTraceRecord();

  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );

  return useMemo(() => {
    // Only show alert for Side Panel mod components
    if (
      activeModComponentFormState.starterBrick.definition.type !==
      StarterBrickTypes.SIDEBAR_PANEL
    ) {
      return false;
    }

    // No traces or no changes since the last render, we are good, no alert
    if (
      traceRecord == null ||
      isEqual(
        // Comments don't change the behavior of the panel
        omit(traceRecord.brickConfig, ["comments"]),
        omit(brickConfig, ["comments"]),
      )
    ) {
      return false;
    }

    return true;
  }, [activeModComponentFormState, traceRecord, brickConfig]);
}

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

  const isRenderedPanelStale = useIsRenderedPanelStale();

  const [activeBuilderPreviewElement, setActiveBuilderPreviewElement] =
    useReduxState(
      selectActiveBuilderPreviewElement,
      editorActions.setActiveBuilderPreviewElement,
    );

  const documentBodyFieldName = joinPathParts(brickPath, "config.body");

  const showFormDesign = shouldShowFormDesign(brickId);
  const showDocumentDesign = shouldShowDocumentDesign(brickId);

  const popupBoundary = showDocumentDesign
    ? document.querySelector(`.${dataPanelStyles.tabContent}`)
    : undefined;

  return (
    <DataTabPane eventKey={DataPanelTabKey.Design}>
      {isRenderedPanelStale && (
        <Alert variant="info">
          The rendered panel is out of date with the design
        </Alert>
      )}
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
          menuBoundary={popupBoundary}
        />
      )}
    </DataTabPane>
  );
};

export default DesignTab;
