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

import browser from "webextension-polyfill";
import { RecipeDefinition } from "@/types/definitions";
import React from "react";
import { Link } from "react-router-dom";
import {
  useSelectedAuths,
  useSelectedExtensions,
} from "@/options/pages/marketplace/ConfigureBody";
import {
  faCubes,
  faExclamationTriangle,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Alert, Card } from "react-bootstrap";
import useEnsurePermissions from "@/options/pages/marketplace/useEnsurePermissions";
import PermissionsBody from "@/options/pages/marketplace/PermissionsBody";
import { resolveRecipe } from "@/registry/internal";
import extensionPointRegistry from "@/extensionPoints/registry";
import { useAsyncState } from "@/hooks/common";
import { isEmpty } from "lodash";
import { useSelector } from "react-redux";
import { selectSettings } from "@/store/settingsSelectors";
import { allSettledValues } from "@/utils";

const QuickBarAlert = () => (
  <Alert variant="warning">
    <FontAwesomeIcon icon={faExclamationTriangle} /> This blueprint contains a
    Quick Bar action, but you have not{" "}
    <a
      href="chrome://extensions/shortcuts"
      onClick={(event) => {
        event.preventDefault();
        void browser.tabs.create({ url: event.currentTarget.href });
      }}
    >
      <u>configured your Quick Bar shortcut</u>.
    </a>{" "}
    Learn more about{" "}
    <a href="https://docs.pixiebrix.com/quick-bar-setup">
      <u>configuring keyboard shortcuts</u>
    </a>
  </Alert>
);

const ActivateBody: React.FunctionComponent<{
  blueprint: RecipeDefinition;
}> = ({ blueprint }) => {
  const selectedExtensions = useSelectedExtensions(blueprint.extensionPoints);
  const selectedAuths = useSelectedAuths();
  const permissionsState = useEnsurePermissions(
    blueprint,
    selectedExtensions,
    selectedAuths
  );
  const { isBlueprintsPageEnabled } = useSelector(selectSettings);

  const [hasShortcut] = useAsyncState(async () => {
    const commands = await browser.commands.getAll();
    return commands.some(
      (command) =>
        command.name === "toggle-quick-bar" && !isEmpty(command.shortcut)
    );
  }, []);

  const [hasQuickBar] = useAsyncState(
    async () => {
      const extensions = await resolveRecipe(
        blueprint,
        blueprint.extensionPoints
      );
      const extensionPoints = await allSettledValues(
        extensions.map(async (config) =>
          extensionPointRegistry.lookup(config.id)
        )
      );
      return extensionPoints.some((x) => x.kind === "quickBar");
    },
    [],
    false
  );

  return (
    <>
      <Card.Body className="mb-0 p-3">
        <Card.Title>Review Permissions & Activate</Card.Title>

        {hasQuickBar && !hasShortcut ? (
          <QuickBarAlert />
        ) : (
          <p className="text-info">
            <FontAwesomeIcon icon={faInfoCircle} /> You can de-activate bricks
            at any time on the{" "}
            <Link to={isBlueprintsPageEnabled ? "/blueprints" : "/installed"}>
              <u className="text-nowrap">
                <FontAwesomeIcon icon={faCubes} />{" "}
                {isBlueprintsPageEnabled
                  ? "Blueprints page"
                  : "Active Bricks page"}
              </u>
            </Link>
          </p>
        )}
      </Card.Body>

      <PermissionsBody {...permissionsState} />
    </>
  );
};

export default ActivateBody;
