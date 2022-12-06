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
import { Button, Card, Col, Row } from "react-bootstrap";
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
import botGamesIllustration from "@img/bot-games-arcade-illustration.png";

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
        "You must accept permissions to participate in the the Bot Games challenge"
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
      <Card>
        <Card.Body>
          {isBotGamesBlueprintCurrentlyInstalled ? (
            <Row>
              <Col className="d-flex justify-content-center flex-column">
                <h3>Alright, let's go!</h3>
                <p>
                  It looks like you're all set. Start working by visiting the{" "}
                  <strong>Bot Games challenge page</strong>.
                </p>
                <div>
                  <a
                    href={BOT_GAMES_CHALLENGE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    <FontAwesomeIcon icon={faExternalLinkAlt} /> Take me to the
                    challenge page
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
                <h3>Alright, let's go!</h3>
                <p>
                  PixieBrix will ask you for{" "}
                  <strong>
                    permission to access the Bot Games challenge pages
                  </strong>{" "}
                  and get you set up with the required Bot Games blueprints.
                  You'll need to do this to participate in the challenge.
                </p>
                <span>
                  <Button
                    onClick={() => {
                      void installBotGamesBlueprint();
                    }}
                  >
                    <FontAwesomeIcon icon={faExternalLinkAlt} /> Accept
                    permissions & take me to the challenge page
                  </Button>
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
