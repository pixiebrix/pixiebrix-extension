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

import React from "react";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import ApiVersionField from "@/pageEditor/fields/ApiVersionField";
import useFlags from "@/hooks/useFlags";
import devtoolFieldOverrides from "@/pageEditor/fields/devtoolFieldOverrides";
import SchemaFieldContext from "@/components/fields/schemaFields/SchemaFieldContext";
import { useSelector } from "react-redux";
import {
  selectActiveModComponentAnalysisAnnotationsForPath,
  selectActiveModComponentFormState,
} from "@/pageEditor/store/editor/editorSelectors";
import useQuickbarShortcut from "@/hooks/useQuickbarShortcut";
import { Alert } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { isInnerDefinitionRegistryId } from "@/types/helpers";
import { openShortcutsTab, SHORTCUTS_URL } from "@/utils/extensionUtils";
import AnalysisAnnotationsContext from "@/analysis/AnalysisAnnotationsContext";
import { assertNotNullish } from "@/utils/nullishUtils";
import { StarterBrickTypes } from "@/types/starterBrickTypes";
import { adapterForComponent } from "@/pageEditor/starterBricks/adapter";
import { FeatureFlags } from "@/auth/featureFlags";

const UnconfiguredQuickBarAlert: React.FunctionComponent = () => {
  const { isConfigured } = useQuickbarShortcut();

  if (!isConfigured) {
    return (
      <Alert variant="warning">
        <FontAwesomeIcon icon={faExclamationTriangle} />
        &nbsp;You have not{" "}
        <a
          href={SHORTCUTS_URL}
          onClick={(event) => {
            event.preventDefault();
            void openShortcutsTab();
          }}
        >
          configured a Quick Bar shortcut
        </a>
      </Alert>
    );
  }

  return null;
};

const StarterBrickConfigPanel: React.FC = () => {
  const { flagOn } = useFlags();
  const showVersionField = flagOn(FeatureFlags.PAGE_EDITOR_DEVELOPER);
  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );
  assertNotNullish(
    activeModComponentFormState,
    "Expected an activeModComponentFormState",
  );
  const { starterBrick } = activeModComponentFormState;

  // For now, don't allow modifying starter brick packages via the Page Editor.
  const isLocked = !isInnerDefinitionRegistryId(starterBrick.metadata.id);

  const { StarterBrickConfigFields } = adapterForComponent(
    activeModComponentFormState,
  );

  return (
    <>
      {starterBrick.definition.type === StarterBrickTypes.QUICK_BAR_ACTION && (
        <UnconfiguredQuickBarAlert />
      )}
      <ConnectedFieldTemplate name="label" label="Name" />
      {showVersionField && <ApiVersionField />}
      <SchemaFieldContext.Provider value={devtoolFieldOverrides}>
        <AnalysisAnnotationsContext.Provider
          value={{
            analysisAnnotationsSelectorForPath:
              selectActiveModComponentAnalysisAnnotationsForPath,
          }}
        >
          <StarterBrickConfigFields isLocked={isLocked} />
        </AnalysisAnnotationsContext.Provider>
      </SchemaFieldContext.Provider>
    </>
  );
};

export default StarterBrickConfigPanel;
