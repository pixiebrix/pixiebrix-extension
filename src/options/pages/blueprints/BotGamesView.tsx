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

import React from "react";
import { Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import extensionsSlice from "@/store/extensionsSlice";
import { useRecipe } from "@/recipes/recipesHooks";
import { RegistryId } from "@/core";
import useInstallablePermissions from "@/options/pages/blueprints/useInstallablePermissions";
import { OptionsState } from "@/store/extensionsTypes";
import { selectExtensionsFromInstallable } from "@/options/pages/blueprints/utils/installableUtils";
import { containsPermissions } from "@/background/messenger/api";
import { collectPermissions, ensureAllPermissions } from "@/permissions";
import { resolveRecipe } from "@/registry/internal";
import useEnsurePermissions from "@/options/pages/marketplace/useEnsurePermissions";
import { useSelectedAuths } from "@/options/pages/marketplace/PermissionsBody";

const BOT_GAMES_BLUEPRINT_ID =
  "@pixies/bot-games/oldportal-enhancements" as RegistryId;
const { installRecipe } = extensionsSlice.actions;

const useInstallBotGamesBlueprint = () => {
  const dispatch = useDispatch();

  const { data: botGamesRecipe } = useRecipe(BOT_GAMES_BLUEPRINT_ID);
  //const selectedAuths = useSelectedAuths();
  // const {request} = useEnsurePermissions(
  //   botGamesRecipe,
  //   botGamesRecipe.extensionPoints,
  //   []
  // );

  return async () => {
    const permissions = await collectPermissions(
      await resolveRecipe(botGamesRecipe, botGamesRecipe.extensionPoints),
      []
    );
    console.warn("permissions", permissions);
    const enabled = await containsPermissions(permissions);

    console.warn("enabled", enabled);

    let accepted = true;

    if (!enabled) {
      accepted = await ensureAllPermissions(permissions);
    }

    if (!accepted) {
      return;
    }

    dispatch(
      installRecipe({
        recipe: botGamesRecipe,
        extensionPoints: botGamesRecipe.extensionPoints,
      })
    );
  };
};

const BotGamesView: React.VoidFunctionComponent<{
  width: number;
  height: number;
}> = ({ width, height }) => {
  const installBotGamesBlueprint = useInstallBotGamesBlueprint();
  return (
    <div style={{ height: `${height}px`, width: `${width}px` }}>
      hello bot games!
      <Button
        onClick={() => {
          installBotGamesBlueprint();
        }}
      >
        Get started by downloading me!
      </Button>
    </div>
  );
};

export default BotGamesView;
