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
import { Card, Col, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import extensionsSlice from "@/store/extensionsSlice";
import { useOptionalRecipe } from "@/recipes/recipesHooks";
import { type RegistryId } from "@/types/registryTypes";
import notify from "@/utils/notify";
import { selectExtensions } from "@/store/extensionsSelectors";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import botGamesIllustration from "@img/bot-games-arcade-illustration.png";
import AsyncButton from "@/components/AsyncButton";
import { ensureRecipePermissionsFromUserGesture } from "@/recipes/recipePermissionsHelpers";

const BOT_GAMES_BLUEPRINT_ID =
  "@pixies/bot-games/oldportal-enhancements" as RegistryId;
const { installRecipe } = extensionsSlice.actions;
const BOT_GAMES_CHALLENGE_URL =
  "https://developer.automationanywhere.com/challenges/event/swivelchairworkflow-challenge.html";

export const useInstallBotGamesBlueprint = () => {
  const dispatch = useDispatch();
  const { data: botGamesRecipe } = useOptionalRecipe(BOT_GAMES_BLUEPRINT_ID);
  const installedExtensions = useSelector(selectExtensions);

  const isBotGamesBlueprintInstalled = installedExtensions.some(
    (extension) => extension._recipe?.id === BOT_GAMES_BLUEPRINT_ID
  );

  const installBotGamesBlueprint = async () => {
    let accepted = true;

    // There shouldn't be any services to configure considering we're hard-coding this Bot Games blueprint
    try {
      accepted = await ensureRecipePermissionsFromUserGesture(
        botGamesRecipe,
        []
      );
    } catch (error) {
      notify.error({
        message: "Error granting permissions",
        error,
      });
      return;
    }

    if (!accepted) {
      notify.warning(
        "You must accept permissions to participate in the Bot Games challenge"
      );
      return;
    }

    dispatch(
      installRecipe({
        recipe: botGamesRecipe,
        extensionPoints: botGamesRecipe.extensionPoints,
      })
    );

    // Open in a new tab
    window.open(BOT_GAMES_CHALLENGE_URL);
  };

  return {
    isBotGamesBlueprintInstalled,
    installBotGamesBlueprint,
  };
};

const BotGamesView: React.VoidFunctionComponent<{
  width: number;
  height: number;
}> = ({ width, height }) => {
  const { isBotGamesBlueprintInstalled, installBotGamesBlueprint } =
    useInstallBotGamesBlueprint();
  return (
    <div style={{ height: `${height}px`, width: `${width}px` }}>
      <Card>
        <Card.Body>
          {isBotGamesBlueprintInstalled ? (
            <Row>
              <Col className="d-flex justify-content-center flex-column">
                <h3>Alright, let&apos;s go!</h3>
                <p>
                  It looks like you&apos;re all set. Start working by visiting
                  the <strong>Bot Games challenge page</strong>.
                </p>
                <div>
                  <a
                    href={BOT_GAMES_CHALLENGE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    <FontAwesomeIcon icon={faExternalLinkAlt} /> Take me to the
                    challenge
                  </a>
                </div>
              </Col>
              <Col className="col-auto">
                <img src={botGamesIllustration} alt="" width={300} />
              </Col>
            </Row>
          ) : (
            <Row className="d-flex">
              <Col className="d-flex justify-content-center flex-column flex-grow-1">
                <h3>Alright, let&apos;s go!</h3>
                <p>
                  Click to open the Bot Games challenge page. Chrome will prompt
                  you to allow PixieBrix to enhance the challenge page.
                  Additionally, PixieBrix will activate the challenge hints mod.
                </p>
                <span>
                  <AsyncButton onClick={installBotGamesBlueprint}>
                    <FontAwesomeIcon icon={faExternalLinkAlt} /> Take me to the
                    challenge
                  </AsyncButton>
                </span>
              </Col>
              <Col className="col-auto">
                <img src={botGamesIllustration} alt="" width={300} />
              </Col>
            </Row>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default BotGamesView;
