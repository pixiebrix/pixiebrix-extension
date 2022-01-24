/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useCallback, useContext, useMemo } from "react";
import { ResolvedExtension } from "@/core";
import {
  ExtensionValidationResult,
  useExtensionValidator,
} from "@/validators/generic";
import { BeatLoader } from "react-spinners";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faDownload,
  faExclamation,
  faList,
  faShare,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import AsyncButton from "@/components/AsyncButton";
import useExtensionPermissions from "@/options/pages/installed/useExtensionPermissions";
import useNotifications from "@/hooks/useNotifications";
import EllipsisMenu from "@/components/ellipsisMenu/EllipsisMenu";
import { ExportBlueprintAction, RemoveAction } from "./installedPageTypes";
import { useDispatch } from "react-redux";
import AuthContext from "@/auth/AuthContext";
import { selectExtensionContext } from "@/extensionPoints/helpers";
import { installedPageSlice } from "./installedPageSlice";

function validationMessage(validation: ExtensionValidationResult) {
  let message = "Invalid Configuration";
  if (validation.notConfigured.length > 0) {
    const services = validation.notConfigured.map((x) => x.serviceId);
    message =
      services.length > 1
        ? `You need to select configurations for ${services.join(", ")}`
        : `You need to select a configuration for ${services[0]}`;
  } else if (validation.missingConfiguration.length > 0) {
    const services = validation.missingConfiguration.map((x) => x.serviceId);
    message = `
      The following services use configurations that no longer exist: ${services.join(
        ", "
      )}`;
  } else {
    console.debug("Validation result", validation);
  }

  return message;
}

const InstalledExtensionRow: React.FunctionComponent<{
  extension: ResolvedExtension;
  onRemove: RemoveAction;
  onExportBlueprint: ExportBlueprintAction;
}> = ({ extension, onRemove, onExportBlueprint }) => {
  const dispatch = useDispatch();

  const { id: extensionId, label, _recipe } = extension;

  const notify = useNotifications();
  const { scope: userScope } = useContext(AuthContext);

  const [hasPermissions, requestPermissions] = useExtensionPermissions(
    extension
  );

  const [validation] = useExtensionValidator(extension);

  const shareExtension = useCallback(() => {
    dispatch(
      installedPageSlice.actions.setShareContext({
        extensionId,
      })
    );
  }, [dispatch, extensionId]);

  const statusElt = useMemo(() => {
    if (hasPermissions == null || validation == null) {
      return <BeatLoader />;
    }

    if (validation && !validation.valid) {
      return (
        <span className="text-danger text-wrap">
          <FontAwesomeIcon icon={faExclamation} />{" "}
          {validationMessage(validation)}
        </span>
      );
    }

    if (hasPermissions) {
      return (
        <span>
          <FontAwesomeIcon icon={faCheck} /> Active
        </span>
      );
    }

    return (
      <AsyncButton variant="info" size="sm" onClick={requestPermissions}>
        Grant Permissions
      </AsyncButton>
    );
  }, [hasPermissions, requestPermissions, validation]);

  const onViewLogs = () => {
    dispatch(
      installedPageSlice.actions.setLogsContext({
        title: label,
        messageContext: selectExtensionContext(extension),
      })
    );
  };

  const onUninstall = () => {
    onRemove({ extensionId });
    notify.success(`Removed brick ${label ?? extensionId}`, {
      event: "ExtensionRemove",
    });
  };

  return (
    <tr>
      <td>&nbsp;</td>
      <td>{label ?? extensionId}</td>
      <td className="text-wrap">{statusElt}</td>
      <td>
        <EllipsisMenu
          items={[
            {
              title: (
                <>
                  <FontAwesomeIcon icon={faShare} /> Share
                </>
              ),
              hide: _recipe != null || userScope == null,
              action: shareExtension,
            },
            {
              title: (
                <>
                  <FontAwesomeIcon icon={faDownload} /> Export
                </>
              ),
              action: () => {
                onExportBlueprint(extensionId);
              },
            },
            {
              title: (
                <>
                  <FontAwesomeIcon icon={faList} /> View Logs
                </>
              ),
              action: onViewLogs,
            },
            {
              title: (
                <>
                  <FontAwesomeIcon icon={faTimes} /> Uninstall
                </>
              ),
              action: onUninstall,
              className: "text-danger",
            },
          ]}
        />
      </td>
    </tr>
  );
};

export default InstalledExtensionRow;
