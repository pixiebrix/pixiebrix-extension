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

import React, { useMemo } from "react";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import ApiVersionField from "@/pageEditor/fields/ApiVersionField";
import UpgradedToApiV3 from "@/pageEditor/tabs/editTab/UpgradedToApiV3";
import useFlags from "@/hooks/useFlags";
import { isInnerExtensionPoint } from "@/registry/internal";
import devtoolFieldOverrides from "@/pageEditor/fields/devtoolFieldOverrides";
import SchemaFieldContext from "@/components/fields/schemaFields/SchemaFieldContext";
import { UnconfiguredQuickBarAlert } from "@/pageEditor/extensionPoints/quickBar";
import { BaseExtensionPointState } from "@/pageEditor/extensionPoints/elementConfig";

const FoundationNodeConfigPanel: React.FC<{
  extensionPoint: BaseExtensionPointState;
  EditorNode: React.ComponentType<{ isLocked: boolean }>;
}> = ({ extensionPoint, EditorNode }) => {
  const { flagOn } = useFlags();
  const showVersionField = flagOn("page-editor-developer");

  // For now, don't allow modifying extensionPoint packages via the Page Editor.
  const isLocked = useMemo(
    () => !isInnerExtensionPoint(extensionPoint.metadata.id),
    [extensionPoint.metadata.id]
  );

  return (
    <>
      {extensionPoint.definition.type === "quickBar" && (
        <UnconfiguredQuickBarAlert />
      )}
      <ConnectedFieldTemplate name="label" label="Extension Name" />
      {showVersionField && <ApiVersionField />}
      <UpgradedToApiV3 />
      <SchemaFieldContext.Provider value={devtoolFieldOverrides}>
        <EditorNode isLocked={isLocked} />
      </SchemaFieldContext.Provider>
    </>
  );
};

export default FoundationNodeConfigPanel;
