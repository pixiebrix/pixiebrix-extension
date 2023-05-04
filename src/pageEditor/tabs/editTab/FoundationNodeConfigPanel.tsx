/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { isInnerExtensionPoint } from "@/registry/internal";
import devtoolFieldOverrides from "@/pageEditor/fields/devtoolFieldOverrides";
import SchemaFieldContext from "@/components/fields/schemaFields/SchemaFieldContext";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import { useSelector } from "react-redux";
import { selectActiveElement } from "@/pageEditor/slices/editorSelectors";
import useQuickbarShortcut from "@/hooks/useQuickbarShortcut";
import { Alert } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { openShortcutsTab, SHORTCUTS_URL } from "@/chrome";

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
  const { extensionPoint } = useSelector(selectActiveElement);

  // For now, don't allow modifying extensionPoint packages via the Page Editor.
  const isLocked = useMemo(
    () => !isInnerExtensionPoint(extensionPoint.metadata.id),
    [extensionPoint.metadata.id]
  );

  const { EditorNode } = ADAPTERS.get(extensionPoint.definition.type);

  return (
    <>
      {extensionPoint.definition.type === "quickBar" && (
        <UnconfiguredQuickBarAlert />
      )}
      <ConnectedFieldTemplate name="label" label="Name" />
      {showVersionField && <ApiVersionField />}
      <UpgradedToApiV3 />
      <SchemaFieldContext.Provider value={devtoolFieldOverrides}>
        <EditorNode isLocked={isLocked} />
      </SchemaFieldContext.Provider>
    </>
  );
};

export default FoundationNodeConfigPanel;
