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
import { useDispatch } from "react-redux";
import extensionsSlice from "@/store/extensionsSlice";
import { useRecipe } from "@/recipes/recipesHooks";
import { RegistryId } from "@/core";

const BOT_GAMES_BLUEPRINT_ID =
  "@pixies/bot-games/oldportal-enhancements" as RegistryId;
const { installRecipe } = extensionsSlice.actions;

const useInstallBotGamesBlueprint = () => {
  const dispatch = useDispatch();

  const { data: botGamesRecipe } = useRecipe(BOT_GAMES_BLUEPRINT_ID);

  console.warn("STUFF", botGamesRecipe);
  return () => {
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
