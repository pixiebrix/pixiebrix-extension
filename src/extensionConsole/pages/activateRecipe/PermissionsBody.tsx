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

import { type ModDefinition } from "@/types/modTypes";
import React, { useMemo } from "react";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Alert } from "react-bootstrap";
import UrlPermissionsList from "@/extensionConsole/pages/activateRecipe/UrlPermissionsList";
import useQuickbarShortcut from "@/hooks/useQuickbarShortcut";
import { type WizardValues } from "@/activation/wizardTypes";
import { type ServiceAuthPair } from "@/types/serviceTypes";
import { useFormikContext } from "formik";
import { openShortcutsTab, SHORTCUTS_URL } from "@/chrome";
import useRecipePermissions from "./useRecipePermissions";
import includesQuickBarExtensionPoint from "@/utils/includesQuickBarExtensionPoint";
import useAsyncState from "@/hooks/useAsyncState";

function selectedAuths(values: WizardValues): ServiceAuthPair[] {
  return values.services.filter((x) => x.config);
}

export function useSelectedAuths(): ServiceAuthPair[] {
  const { values } = useFormikContext<WizardValues>();
  return useMemo(() => selectedAuths(values), [values]);
}

const QuickBarAlert = () => (
  <Alert variant="warning">
    <FontAwesomeIcon icon={faExclamationTriangle} /> This mod contains a Quick
    Bar action, but you have not{" "}
    <a
      href={SHORTCUTS_URL}
      onClick={(event) => {
        // Can't link to chrome:// URLs directly
        event.preventDefault();
        void openShortcutsTab();
      }}
    >
      <u>configured your Quick Bar shortcut</u>.
    </a>{" "}
    Learn more about{" "}
    <a href="https://docs.pixiebrix.com/quick-bar-setup">
      <u>configuring keyboard shortcuts</u>
    </a>
  </Alert>
);

const PermissionsBody: React.FunctionComponent<{
  blueprint: ModDefinition;
}> = ({ blueprint }) => {
  const selectedAuths = useSelectedAuths();

  const permissionsState = useRecipePermissions(blueprint, selectedAuths);

  const { isConfigured: isShortcutConfigured } = useQuickbarShortcut();

  const { data: hasQuickBar } = useAsyncState(
    async () => includesQuickBarExtensionPoint(blueprint),
    [],
    { initialValue: false }
  );

  return (
    <div>
      {hasQuickBar && !isShortcutConfigured && <QuickBarAlert />}
      <UrlPermissionsList {...permissionsState} />
    </div>
  );
};

export default PermissionsBody;
