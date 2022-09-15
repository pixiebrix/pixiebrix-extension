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
import { RecipeDefinition } from "@/types/definitions";
import { useLocation } from "react-router";
import useEnsurePermissions from "@/options/pages/marketplace/useEnsurePermissions";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import { uninstallContextMenu } from "@/background/messenger/api";
import notify from "@/utils/notify";
import AsyncButton from "@/components/AsyncButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagic } from "@fortawesome/free-solid-svg-icons";
import extensionsSlice from "@/store/extensionsSlice";
import { useSelectedAuths } from "@/options/pages/marketplace/PermissionsBody";

const { removeExtension } = extensionsSlice.actions;

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
  const localExtensions = useSelector(selectExtensions);
  const installedExtensions = useMemo(
    () =>
      localExtensions?.filter(
        (extension) => extension._recipe?.id === blueprint?.metadata.id
      ),
    [blueprint, localExtensions]
  );

  const uninstallExtensions = async () => {
    for (const extension of installedExtensions) {
      const extensionRef = { extensionId: extension.id };
      // eslint-disable-next-line no-await-in-loop -- see useReinstall.ts
      await uninstallContextMenu(extensionRef);
      dispatch(removeExtension(extensionRef));
    }
  };

  const activateOrReinstall = async () => {
    if (!reinstall) {
      activate();
      return;
    }

    try {
      await uninstallExtensions();
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
