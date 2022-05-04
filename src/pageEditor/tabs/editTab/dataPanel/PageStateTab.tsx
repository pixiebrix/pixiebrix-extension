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
import JsonTree from "@/components/jsonTree/JsonTree";
import { getPageState } from "@/contentScript/messenger/api";
import { getErrorMessage } from "@/errors";
import { useAsyncState } from "@/hooks/common";
import { selectActiveElement } from "@/pageEditor/slices/editorSelectors";
import { thisTab } from "@/pageEditor/utils";
import { faExternalLinkAlt, faSync } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button } from "react-bootstrap";
import { useSelector } from "react-redux";

const alwaysExpandNode = () => true;

const PageStateTab: React.VFC = () => {
  const activeElement = useSelector(selectActiveElement);

  const [state, isLoading, error, refresh] = useAsyncState(
    async () => {
      const [shared, blueprint, extension] = await Promise.all([
        getPageState(thisTab, "shared"),
        activeElement.recipe
          ? getPageState(thisTab, "blueprint", activeElement.recipe.id)
          : Promise.resolve("Extension is not in a blueprint"),
        getPageState(thisTab, "extension", null, activeElement.uuid),
      ]);

      return {
        extension,
        blueprint,
        shared,
      };
    },
    [],
    {
      extension: "Loading...",
      blueprint: "Loading...",
      shared: "Loading...",
    }
  );

  return (
    <div>
      <div className="mb-1 d-flex">
        <div>
          <Button
            variant="info"
            size="sm"
            disabled={isLoading}
            onClick={refresh}
          >
            <FontAwesomeIcon icon={faSync} /> Refresh
          </Button>
        </div>
        <div className="ml-2">
          <a
            href="https://docs.pixiebrix.com/page-state"
            target="_blank"
            rel="noreferrer"
          >
            <small>
              <FontAwesomeIcon icon={faExternalLinkAlt} />
              &nbsp;Learn more about Page State
            </small>
          </a>
        </div>
      </div>
      {error ? (
        <div>
          <div className="text-danger">Error</div>
          <p>{getErrorMessage(error)}</p>
        </div>
      ) : (
        <JsonTree
          data={state}
          copyable={false}
          shouldExpandNode={alwaysExpandNode}
        />
      )}
    </div>
  );
};

export default PageStateTab;
