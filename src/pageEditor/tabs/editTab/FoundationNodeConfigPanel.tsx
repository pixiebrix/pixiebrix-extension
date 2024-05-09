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

import React, { useMemo } from "react";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import ApiVersionField from "@/pageEditor/fields/ApiVersionField";
import UpgradedToApiV3 from "@/pageEditor/tabs/editTab/UpgradedToApiV3";
import useFlags from "@/hooks/useFlags";
import devtoolFieldOverrides from "@/pageEditor/fields/devtoolFieldOverrides";
import SchemaFieldContext from "@/components/fields/schemaFields/SchemaFieldContext";
import { ADAPTERS } from "@/pageEditor/starterBricks/adapter";
import { useSelector } from "react-redux";
import {
  selectActiveModComponentAnalysisAnnotationsForPath,
  selectActiveModComponentFormState,
} from "@/pageEditor/slices/editorSelectors";
import useQuickbarShortcut from "@/hooks/useQuickbarShortcut";
import { Alert } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";

import { isInnerDefinitionRegistryId } from "@/types/helpers";

import { openShortcutsTab, SHORTCUTS_URL } from "@/utils/extensionUtils";
import AnalysisAnnotationsContext from "@/analysis/AnalysisAnnotationsContext";

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

const FoundationNodeConfigPanel: React.FC = () => {
  const { flagOn } = useFlags();
  const showVersionField = flagOn("page-editor-developer");
  const { extensionPoint: starterBrick } = useSelector(
    selectActiveModComponentFormState,
  );

  // For now, don't allow modifying extensionPoint packages via the Page Editor.
  const isLocked = useMemo(
    () => !isInnerDefinitionRegistryId(starterBrick.metadata.id),
    [starterBrick.metadata.id],
  );

  const { EditorNode } = ADAPTERS.get(starterBrick.definition.type);

  return (
    <>
      {starterBrick.definition.type === "quickBar" && (
        <UnconfiguredQuickBarAlert />
      )}
      <ConnectedFieldTemplate name="label" label="Name" />
      {showVersionField && <ApiVersionField />}
      <UpgradedToApiV3 />
      <SchemaFieldContext.Provider value={devtoolFieldOverrides}>
        <AnalysisAnnotationsContext.Provider
          value={{
            analysisAnnotationsSelectorForPath:
              selectActiveModComponentAnalysisAnnotationsForPath,
          }}
        >
          <EditorNode isLocked={isLocked} />
        </AnalysisAnnotationsContext.Provider>
      </SchemaFieldContext.Provider>
    </>
  );
};

export default FoundationNodeConfigPanel;
