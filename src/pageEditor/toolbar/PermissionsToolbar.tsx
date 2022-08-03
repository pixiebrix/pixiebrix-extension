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

import React, { useCallback } from "react";
import { Button, ButtonGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShieldAlt } from "@fortawesome/free-solid-svg-icons";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import { ensureAllPermissions, extensionPermissions } from "@/permissions";
import { fromJS as extensionPointFactory } from "@/extensionPoints/factory";
import { Permissions } from "webextension-polyfill";
import { useDebounce } from "use-debounce";
import notify from "@/utils/notify";
import { containsPermissions } from "@/background/messenger/api";
import { FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { useAsyncState } from "@/hooks/common";

type PermissionsState = {
  hasPermissions: boolean;
  permissions: Permissions.Permissions;
};

const defaultState = {
  hasPermissions: true,
  permissions: {},
};

const PERMISSION_UPDATE_MILLIS = 200;

const PermissionsToolbar: React.FunctionComponent<{
  element: FormState;
  disabled: boolean;
}> = ({ element, disabled }) => {
  const [debouncedElement] = useDebounce(element, PERMISSION_UPDATE_MILLIS, {
    leading: false,
    trailing: true,
  });

  const [
    // We use defaultState as
    // 1. initial state before the permissions are fetched
    // 2. state in case of error; if the async callback fails, we fallback to this default permissions
    { hasPermissions, permissions } = defaultState,
    isLoadingPermissions,
    ,
    reloadPermissions,
  ] = useAsyncState<PermissionsState>(async () => {
    const adapter = ADAPTERS.get(debouncedElement.type);
    const { extension, extensionPoint: extensionPointConfig } =
      adapter.asDynamicElement(debouncedElement);
    const extensionPoint = extensionPointFactory(extensionPointConfig);

    const permissions = await extensionPermissions(extension, {
      extensionPoint,
    });

    console.debug("Checking for extension permissions", {
      extension,
      permissions,
    });

    const hasPermissions = await containsPermissions(permissions);

    return { hasPermissions, permissions };
  }, [debouncedElement]);

  const request = useCallback(async () => {
    if (await ensureAllPermissions(permissions)) {
      notify.success("Granted additional permissions");
      await reloadPermissions();
    } else {
      notify.info("You declined the additional required permissions");
    }
  }, [permissions, reloadPermissions]);

  return (
    <ButtonGroup>
      {!hasPermissions && (
        <Button
          disabled={disabled || isLoadingPermissions}
          onClick={request}
          size="sm"
          variant="primary"
        >
          <FontAwesomeIcon icon={faShieldAlt} /> Grant Permissions
        </Button>
      )}
    </ButtonGroup>
  );
};

export default PermissionsToolbar;
