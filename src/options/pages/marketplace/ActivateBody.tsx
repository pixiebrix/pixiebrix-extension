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

import { ExtensionPointConfig, RecipeDefinition } from "@/types/definitions";
import React, { useCallback, useMemo } from "react";
import { useFormikContext } from "formik";
import { Card } from "react-bootstrap";
import { Link } from "react-router-dom";
import {
  useSelectedAuths,
  useSelectedExtensions,
} from "@/options/pages/marketplace/ConfigureBody";
import { collectPermissions, ensureAllPermissions } from "@/permissions";
import { locator } from "@/background/locator";
import GridLoader from "react-spinners/GridLoader";
import { useAsyncState } from "@/hooks/common";
import { faCubes, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { reportEvent } from "@/telemetry/events";
import { getErrorMessage } from "@/errors";
import { containsPermissions } from "@/utils/permissions";
import { ServiceAuthPair } from "@/core";
import useNotifications from "@/hooks/useNotifications";

interface ActivateProps {
  blueprint: RecipeDefinition;
}

export function useEnsurePermissions(
  blueprint: RecipeDefinition,
  extensions: ExtensionPointConfig[],
  serviceAuths: ServiceAuthPair[]
) {
  const notify = useNotifications();
  const { submitForm } = useFormikContext();

  const [permissionState, isPending, error] = useAsyncState(async () => {
    await locator.refreshLocal();
    const permissions = await collectPermissions(extensions, serviceAuths);
    const enabled = await containsPermissions(permissions);
    return {
      enabled,
      permissions,
    };
  }, [extensions, serviceAuths]);

  const { enabled, permissions } = permissionState ?? {
    enabled: false,
    permissions: null,
  };

  const request = useCallback(async () => {
    let accepted = false;

    try {
      accepted = await ensureAllPermissions(permissions);
    } catch (error: unknown) {
      notify.error(`Error granting permissions: ${getErrorMessage(error)}`, {
        error,
      });
      return false;
    }

    if (!accepted) {
      notify.warning("You declined the permissions");
      return false;
    }

    return true;
  }, [permissions, notify]);

  const activate = useCallback(() => {
    // Can't use async here because Firefox loses track of trusted UX event
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    void request().then((accepted: boolean) => {
      if (accepted) {
        reportEvent("MarketplaceActivate", {
          blueprintId: blueprint.metadata.id,
          extensions: extensions.map((x) => x.label),
        });
        return submitForm();
      }

      reportEvent("MarketplaceRejectPermissions", {
        blueprintId: blueprint.metadata.id,
        extensions: extensions.map((x) => x.label),
      });
    });
  }, [extensions, request, submitForm, blueprint.metadata]);

  return {
    enabled,
    request,
    permissions,
    activate,
    isPending,
    extensions,
    error,
  };
}

const ActivateBody: React.FunctionComponent<ActivateProps> = ({
  blueprint,
}) => {
  const selectedExtensions = useSelectedExtensions(blueprint.extensionPoints);
  const selectedAuths = useSelectedAuths();
  const { enabled, isPending, permissions, error } = useEnsurePermissions(
    blueprint,
    selectedExtensions,
    selectedAuths
  );

  console.log(permissions);

  const permissionsList = useMemo(() => {
    if (permissions === null) {
      return [];
    }

    const accessUrls = permissions.origins;
    const controlPermissions = permissions.permissions.filter(
      (permission, index, self) => {
        // get a list of only unique permissions
        return self.indexOf(permission) === index;
      }
    );

    return [...controlPermissions, ...accessUrls];
  }, [permissions]);

  if (error) {
    console.error(error);
  }

  return (
    <>
      <Card.Body className="mb-0 p-3">
        <Card.Title>Review Permissions & Activate</Card.Title>
        <p className="text-info">
          <FontAwesomeIcon icon={faInfoCircle} /> You can de-activate bricks at
          any time on the{" "}
          <Link to="/installed">
            <u>
              <FontAwesomeIcon icon={faCubes} />
              {"  "}Active Bricks page
            </u>
          </Link>
        </p>
      </Card.Body>

      <Card.Body className="p-3">
        <Card.Subtitle>Permissions & URLs</Card.Subtitle>

        {enabled == null || !enabled ? (
          <Card.Text>
            Your browser will prompt to you approve any permissions you
            haven&apos;t granted yet
          </Card.Text>
        ) : (
          <Card.Text>
            PixieBrix already has the permissions required for the bricks
            you&apos;ve selected
          </Card.Text>
        )}

        {isPending && <GridLoader />}
        <ul>
          {error && (
            <li className="text-danger">
              An error occurred while determining the permissions
            </li>
          )}
          {permissionsList?.length > 0 &&
            permissionsList.map((permission, i) => (
              <li key={i}>{permission}</li>
            ))}
          {permissionsList?.length === 0 && (
            <li>No special permissions required</li>
          )}
        </ul>
      </Card.Body>
    </>
  );
};

export default ActivateBody;
