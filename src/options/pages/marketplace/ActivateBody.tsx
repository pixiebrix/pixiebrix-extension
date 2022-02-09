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
import { Card } from "react-bootstrap";
import useEnsurePermissions from "@/options/pages/marketplace/useEnsurePermissions";
import PermissionsBody from "@/options/pages/marketplace/PermissionsBody";
import { resolveRecipe } from "@/registry/internal";
import extensionPointRegistry from "@/extensionPoints/registry";
import { isMac } from "@/utils";
import { useAsyncState } from "@/hooks/common";
import { isEmpty } from "lodash";
import { faChrome } from "@fortawesome/free-brands-svg-icons";
import reportError from "@/telemetry/reportError";

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
      return extensions.some(async (config) => {
        try {
          const extensionPoint = await extensionPointRegistry.lookup(config.id);
          return extensionPoint.kind === "quickBar";
        } catch (error) {
          reportError(error);
          return false;
        }
      });
    },
    [],
    false
  );

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
        {hasQuickBar && !hasShortcut && (
          <p className="text-info">
            <FontAwesomeIcon icon={faExclamationTriangle} /> This blueprint
            contains one or more Quick Bar extensions, but you have not
            configured a Quick Bar shortcut in Chrome. Go to{" "}
            <a
              href="chrome://extensions/shortcuts"
              onClick={(event) => {
                event.preventDefault();
                void browser.tabs.create({ url: event.currentTarget.href });
              }}
            >
              <u>
                <FontAwesomeIcon icon={faChrome} />
                {"  "}chrome://extensions/shortcuts
              </u>
            </a>{" "}
            to configure a shortcut. For now, the default is{" "}
            <kbd style={{ fontFamily: "system" }}>
              {isMac() ? "Command+K" : "Ctrl+K"}
            </kbd>
            .{" "}
            <a href="https://docs.pixiebrix.com/quick-bar-setup">
              <u>Read more about extension shortcuts here.</u>
            </a>
          </p>
        )}
      </Card.Body>

      <PermissionsBody {...permissionsState} />
    </>
  );
};

export default ActivateBody;
