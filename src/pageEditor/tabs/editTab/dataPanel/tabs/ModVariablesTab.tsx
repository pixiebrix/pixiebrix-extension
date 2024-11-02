/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import { getErrorMessage } from "@/errors/errorHelpers";
import { selectActiveModComponentRef } from "@/pageEditor/store/editor/editorSelectors";
import { faExternalLinkAlt, faSync } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button } from "react-bootstrap";
import { useSelector } from "react-redux";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import DataTabPane from "@/pageEditor/tabs/editTab/dataPanel/DataTabPane";
import useAsyncState from "@/hooks/useAsyncState";
import { type ShouldExpandNodeInitially } from "react-json-tree";
import { inspectedTab } from "@/pageEditor/context/connection";
import { resolveObj } from "@/utils/promiseUtils";
import { StateNamespaces } from "@/platform/state/stateTypes";

// We used to expand nodes initially. But makes state hard to read when using async state with long values, e.g.,
// long ChatGPT responses
const expandTopLevelNodes: ShouldExpandNodeInitially = (
  _keyPath,
  _data,
  level,
) => level <= 1;

type StateValues = {
  Private: UnknownObject | string;
  Mod: UnknownObject | string;
  Public: UnknownObject | string;
};

/**
 * Data panel tab displaying mod variables, and private/public state.
 */
const ModVariablesTab: React.FC = () => {
  const modComponentRef = useSelector(selectActiveModComponentRef);

  const state = useAsyncState<StateValues>(
    async () =>
      // Cast because `resolveObj` doesn't keep track of the keys
      resolveObj<UnknownObject | string>({
        Public: getPageState(inspectedTab, {
          namespace: StateNamespaces.PUBLIC,
          modComponentRef,
        }),
        Mod: getPageState(inspectedTab, {
          namespace: StateNamespaces.MOD,
          modComponentRef,
        }),
        Private: getPageState(inspectedTab, {
          namespace: StateNamespaces.PRIVATE,
          modComponentRef,
        }),
      }) as Promise<StateValues>,
    [],
    {
      initialValue: {
        Private: "Loading...",
        Mod: "Loading...",
        Public: "Loading...",
      },
    },
  );

  return (
    <DataTabPane eventKey={DataPanelTabKey.ModVariables}>
      <div className="mb-1 d-flex">
        <div>
          <Button
            variant="info"
            size="sm"
            disabled={state.isFetching}
            onClick={state.refetch}
          >
            <FontAwesomeIcon icon={faSync} /> Refresh
          </Button>
        </div>
        <div className="ml-2">
          <a
            href="https://docs.pixiebrix.com/developing-mods/developer-concepts/data-context/using-mod-variables"
            target="_blank"
            rel="noreferrer"
          >
            <small>
              <FontAwesomeIcon icon={faExternalLinkAlt} />
              &nbsp;Learn more about Mod Variables
            </small>
          </a>
        </div>
      </div>
      {state.isError ? (
        <div>
          <div className="text-danger">Error</div>
          <p>{getErrorMessage(state.error)}</p>
        </div>
      ) : (
        <JsonTree
          data={state.data}
          copyable={false}
          shouldExpandNodeInitially={expandTopLevelNodes}
        />
      )}
    </DataTabPane>
  );
};

export default ModVariablesTab;
