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
import { containsPermissions } from "@/background/messenger/api";
import { collectPermissions, ensureAllPermissions } from "@/permissions";
import { resolveRecipe } from "@/registry/internal";
import notify from "@/utils/notify";
import { selectExtensions } from "@/store/extensionsSelectors";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const BOT_GAMES_BLUEPRINT_ID =
  "@pixies/bot-games/oldportal-enhancements" as RegistryId;
const { installRecipe } = extensionsSlice.actions;
const BOT_GAMES_CHALLENGE_URL =
  "https://developer.automationanywhere.com/challenges/event/swivelchairworkflow-challenge.html";

export const useInstallBotGamesBlueprint = () => {
  const dispatch = useDispatch();
  const { data: botGamesRecipe } = useRecipe(BOT_GAMES_BLUEPRINT_ID);
  const installedExtensions = useSelector(selectExtensions);

  const isBotGamesBlueprintCurrentlyInstalled = installedExtensions.some(
    (extension) => extension._recipe?.id === BOT_GAMES_BLUEPRINT_ID
  );

  const installBotGamesBlueprint = async () => {
    const permissions = await collectPermissions(
      await resolveRecipe(botGamesRecipe, botGamesRecipe.extensionPoints),
      // There shouldn't be any services to configure considering we're hard-coding this Bot Games blueprint
      []
    );
    const enabled = await containsPermissions(permissions);
    let accepted = true;

    if (!enabled) {
      try {
        accepted = await ensureAllPermissions(permissions);
      } catch (error) {
        notify.error({
          message: "Error granting permissions",
          error,
        });
        return;
      }
    }

    if (!accepted) {
      notify.warning(
        "You must accept permissions to install the Bot Games blueprint"
      );
      return;
    }

    dispatch(
      installRecipe({
        recipe: botGamesRecipe,
        extensionPoints: botGamesRecipe.extensionPoints,
      })
    );

    window.open(BOT_GAMES_CHALLENGE_URL);
  };

  return {
    isBotGamesBlueprintCurrentlyInstalled,
    installBotGamesBlueprint,
  };
};

const BotGamesView: React.VoidFunctionComponent<{
  width: number;
  height: number;
}> = ({ width, height }) => {
  const { isBotGamesBlueprintCurrentlyInstalled, installBotGamesBlueprint } =
    useInstallBotGamesBlueprint();
  return (
    <div style={{ height: `${height}px`, width: `${width}px` }}>
      {isBotGamesBlueprintCurrentlyInstalled ? (
        <>
          <h3>You're all set!</h3>
          <a
            href={BOT_GAMES_CHALLENGE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} />
            Take me to the challenge page
          </a>
        </>
      ) : (
        <>
          <h3>You're almost ready to go!</h3>
          <Button
            onClick={() => {
              void installBotGamesBlueprint();
            }}
          >
            Get started by downloading me!
          </Button>
        </>
      )}
    </div>
  );
};

export default BotGamesView;
