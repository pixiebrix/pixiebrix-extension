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

import type {
  EditorRootState,
  RootState,
} from "@/pageEditor/store/editor/pageEditorTypes";
import { createSelector } from "@reduxjs/toolkit";
import { selectActiveModComponentId } from "@/pageEditor/store/editor/editorSelectors/editorNavigationSelectors";
import type { AnalysisRootState } from "@/analysis/analysisTypes";
import { sortBy } from "lodash";
import { AnnotationType } from "@/types/annotationTypes";
import { selectKnownEventNames } from "@/analysis/analysisSelectors";
import { expectContext } from "@/utils/expectContext";

const selectGetActiveModComponentAnalysisAnnotationsForPath = createSelector(
  selectActiveModComponentId,
  ({ analysis }: AnalysisRootState) => analysis.extensionAnnotations,
  (_state: RootState, path?: string) => path,
  ({ editor }: EditorRootState) => editor.isVariablePopoverVisible,
  (activeModComponentId, annotations, path, isVariablePopoverVisible) => {
    if (activeModComponentId == null) {
      return [];
    }

    const modComponentFormStateAnnotations =
      // eslint-disable-next-line security/detect-object-injection -- non-user generated UUID
      annotations?.[activeModComponentId] ?? [];

    const filteredAnnotations = modComponentFormStateAnnotations.filter(
      ({ analysisId, position }) =>
        position.path === path &&
        // Hide variable/template annotations while the popover is open because the user is editing the field
        (!isVariablePopoverVisible ||
          !["var", "template"].includes(analysisId)),
    );

    return sortBy(filteredAnnotations, (annotation) => {
      switch (annotation.type) {
        case AnnotationType.Error: {
          return 2;
        }

        case AnnotationType.Warning: {
          return 1;
        }

        case AnnotationType.Info: {
          return 0;
        }

        default: {
          const exhaustiveCheck: never = annotation.type;
          throw new Error(`Invalid annotation type: ${exhaustiveCheck}`);
        }
      }
    });
  },
);

/**
 * Selects the analysis annotations for the given path
 * @param path A path relative to the root of the mod component or root pipeline
 *
 * @note This method should NOT be used outside the Page Editor, it is tightly coupled with editorSlice
 */
export const selectActiveModComponentAnalysisAnnotationsForPath =
  (path?: string) => (state: RootState) => {
    expectContext("pageEditor");
    return selectGetActiveModComponentAnalysisAnnotationsForPath(state, path);
  };

export const selectKnownEventNamesForActiveModComponent = createSelector(
  selectActiveModComponentId,
  selectKnownEventNames,
  (activeModComponentId, knownEventNameMap) => {
    if (activeModComponentId == null) {
      return [];
    }

    // eslint-disable-next-line security/detect-object-injection -- is a UUID
    return knownEventNameMap[activeModComponentId] ?? [];
  },
);

// Not analysis of the analysis engine/linter sense, but tracks which components are available on the page
export const selectModComponentAvailability = ({
  editor: {
    availableActivatedModComponentIds,
    isPendingAvailableActivatedModComponents,
    availableDraftModComponentIds,
    isPendingDraftModComponents,
  },
}: EditorRootState) => ({
  availableActivatedModComponentIds,
  isPendingAvailableActivatedModComponents,
  availableDraftModComponentIds,
  isPendingDraftModComponents,
});
