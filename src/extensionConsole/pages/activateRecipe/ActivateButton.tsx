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
import { type RecipeDefinition } from "@/types/recipeTypes";
import { useLocation } from "react-router";
import notify from "@/utils/notify";
import AsyncButton from "@/components/AsyncButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagic } from "@fortawesome/free-solid-svg-icons";
import { useSelectedAuths } from "@/extensionConsole/pages/activateRecipe/PermissionsBody";
import { useFormikContext } from "formik";
import { reportEvent } from "@/telemetry/events";
import { getErrorMessage } from "@/errors/errorHelpers";
import useRecipePermissions from "./useRecipePermissions";

function selectActivateEventData(recipe: RecipeDefinition) {
  return {
    blueprintId: recipe.metadata.id,
    extensions: recipe.extensionPoints.map((x) => x.label),
  };
}

/**
 * Connect Component to request permissions and then submit the Formik form.
 * @param blueprint the blueprint to activate
 * @constructor
 */
const ActivateButton: React.FunctionComponent<{
  recipe: RecipeDefinition;
}> = ({ recipe }) => {
  const { submitForm } = useFormikContext();
  const location = useLocation();
  const serviceAuths = useSelectedAuths();
  const { request, isFetching: isPermissionsPending } = useRecipePermissions(
    recipe,
    serviceAuths
  );

  const isReactivate =
    new URLSearchParams(location.search).get("reinstall") === "1";

  // eslint-disable-next-line @typescript-eslint/promise-function-async -- preserve user action call chain
  const onActivate = () =>
    // `request` for permissions _must_ be called first to ensure Chrome sees the permissions request as coming from
    // a trusted user action.
    request()
      // eslint-disable-next-line promise/prefer-await-to-then, @typescript-eslint/promise-function-async -- call chain
      .then((accepted) => {
        if (accepted) {
          reportEvent("MarketplaceActivate", {
            ...selectActivateEventData(recipe),
            reactivate: isReactivate,
          });
          return submitForm();
        }

        reportEvent("MarketplaceRejectPermissions", {
          ...selectActivateEventData(recipe),
          reactivate: isReactivate,
        });
      })
      // eslint-disable-next-line promise/prefer-await-to-then -- preserve user action call chain
      .catch((error) => {
        if (getErrorMessage(error).toLowerCase().includes("user gesture")) {
          notify.warning({
            message: "Unable to request mod permissions, try again.",
            includeErrorDetails: false,
            reportError: true,
            error,
          });
        } else {
          notify.error({
            message: `Error ${
              isReactivate ? "re-activating" : "activating"
            } mod`,
            error,
          });
        }
      });

  return (
    <AsyncButton
      className="text-nowrap"
      disabled={isPermissionsPending}
      onClick={onActivate}
    >
      <FontAwesomeIcon icon={faMagic} />{" "}
      {isReactivate ? "Reactivate" : "Activate"}
    </AsyncButton>
  );
};

export default ActivateButton;
