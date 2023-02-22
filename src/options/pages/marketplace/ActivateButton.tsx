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
import { type RecipeDefinition } from "@/types/definitions";
import { useLocation } from "react-router";
import useEnsurePermissions from "@/options/pages/marketplace/useEnsurePermissions";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensionsForRecipe } from "@/store/extensionsSelectors";
import notify from "@/utils/notify";
import AsyncButton from "@/components/AsyncButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagic } from "@fortawesome/free-solid-svg-icons";
import { useSelectedAuths } from "@/options/pages/marketplace/PermissionsBody";
import { uninstallRecipe } from "@/store/uninstallUtils";

const ActivateButton: React.FunctionComponent<{
  blueprint: RecipeDefinition;
}> = ({ blueprint }) => {
  const location = useLocation();
  const reinstall =
    new URLSearchParams(location.search).get("reinstall") === "1";
  const serviceAuths = useSelectedAuths();
  const { activate, isPending } = useEnsurePermissions(
    blueprint,
    blueprint.extensionPoints,
    serviceAuths
  );
  const dispatch = useDispatch();

  const blueprintId = blueprint?.metadata.id;
  const blueprintExtensions = useSelector(
    selectExtensionsForRecipe(blueprintId)
  );

  const activateOrReinstall = async () => {
    if (!reinstall || !blueprintId) {
      activate();
      return;
    }

    try {
      await uninstallRecipe(blueprintId, blueprintExtensions, dispatch);
      activate();
    } catch (error) {
      notify.error({
        message: "Error re-installing bricks",
        error,
      });
    }
  };

  return (
    <AsyncButton
      className="text-nowrap"
      disabled={isPending}
      onClick={activateOrReinstall}
    >
      <FontAwesomeIcon icon={faMagic} /> {reinstall ? "Reactivate" : "Activate"}
    </AsyncButton>
  );
};

export default ActivateButton;
