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

import React from "react";
import { Button, ButtonGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShieldAlt } from "@fortawesome/free-solid-svg-icons";
import { useDebounce } from "use-debounce";
import notify from "@/utils/notify";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import useAsyncState from "@/hooks/useAsyncState";
import {
  emptyPermissionsFactory,
  ensureAllPermissionsFromUserGesture,
} from "@/permissions/permissionsUtils";
import { calculatePermissionsForElement } from "@/pageEditor/editorPermissionsHelpers";
import { fallbackValue } from "@/utils/asyncStateUtils";
import { type Permissions } from "webextension-polyfill";

const fallbackState = {
  hasPermissions: true,
  permissions: emptyPermissionsFactory() as Permissions.Permissions,
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

  const state = useAsyncState(
    async () => calculatePermissionsForElement(debouncedElement),
    [debouncedElement]
  );
  const {
    refetch,
    data: { permissions, hasPermissions },
  } = fallbackValue(state, fallbackState);

  const requestPermissions = async () => {
    if (await ensureAllPermissionsFromUserGesture(permissions)) {
      notify.success("Granted additional permissions");
      refetch();
    } else {
      notify.info("You declined the additional required permissions");
    }
  };

  return (
    <ButtonGroup>
      {!hasPermissions && (
        <Button
          disabled={disabled || state.isFetching}
          onClick={requestPermissions}
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
