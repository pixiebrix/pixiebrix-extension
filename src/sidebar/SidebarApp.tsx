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

import styles from "./SidebarApp.module.scss";

import React, { Dispatch, useEffect, useMemo, useReducer } from "react";
import { Button } from "react-bootstrap";
import logo from "@img/logo.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDoubleRight, faCog } from "@fortawesome/free-solid-svg-icons";
// eslint-disable-next-line import/no-restricted-paths -- TODO: This should be called in the content script, but it currently has to be sync
import { getSidebarStore } from "@/contentScript/sidebar";
import { addListener, removeListener, StoreListener } from "@/sidebar/protocol";
import DefaultPanel from "@/sidebar/DefaultPanel";
// eslint-disable-next-line import/no-restricted-paths -- TODO: move out of @/options or use Messenger
import store, { persistor } from "@/options/store";
import { Provider } from "react-redux";
import Loader from "@/components/Loader";
import { PersistGate } from "redux-persist/integration/react";
import { PanelEntry, FormEntry } from "@/sidebar/types";
import Tabs from "@/sidebar/Tabs";
import slice, { blankSidebarState } from "./slice";
import { AnyAction } from "redux";
import { hideSidebar } from "@/contentScript/messenger/api";
import { whoAmI } from "@/background/messenger/api";

function getConnectedListener(dispatch: Dispatch<AnyAction>): StoreListener {
  return {
    onRenderPanels(panels: PanelEntry[]) {
      dispatch(slice.actions.setPanels({ panels }));
    },
    onShowForm(form: FormEntry) {
      dispatch(slice.actions.addForm({ form }));
    },
    onHideForm({ nonce }: Partial<FormEntry>) {
      dispatch(slice.actions.removeForm(nonce));
    },
  };
}

const SidebarApp: React.FunctionComponent = () => {
  const [state, dispatch] = useReducer(slice.reducer, {
    ...blankSidebarState,
    ...getSidebarStore(),
  });

  const listener: StoreListener = useMemo(
    () => getConnectedListener(dispatch),
    [dispatch]
  );

  // `effect` will run once on component mount since listener and formsRef don't change on renders
  useEffect(() => {
    addListener(listener);
    return () => {
      // NOTE: we don't need to cancel any outstanding forms on unmount because the FormTransformer is set up to watch
      // for PANEL_HIDING_EVENT. (and the only time this SidebarApp would unmount is if the sidebar was closing)
      removeListener(listener);
    };
  }, [listener]);

  return (
    <Provider store={store}>
      <PersistGate loading={<Loader />} persistor={persistor}>
        <div className="full-height">
          <div className="d-flex p-2 justify-content-between align-content-center">
            <Button
              className={styles.button}
              onClick={async () => {
                const sidebar = await whoAmI();
                await hideSidebar({ tabId: sidebar.tab.id });
              }}
              size="sm"
              variant="link"
            >
              <FontAwesomeIcon icon={faAngleDoubleRight} className="fa-lg" />
            </Button>
            <div className="align-self-center">
              <img
                src={logo}
                alt="PixieBrix logo"
                height={20}
                className="px-4"
              />
            </div>
            <Button
              href="/options.html"
              target="_blank"
              size="sm"
              variant="link"
              className={styles.button}
            >
              <span>
                Options <FontAwesomeIcon icon={faCog} />
              </span>
            </Button>
          </div>

          <div className="full-height">
            {state.panels?.length || state.forms?.length ? (
              <Tabs
                {...state}
                onSelectTab={(eventKey: string) => {
                  dispatch(slice.actions.selectTab(eventKey));
                }}
              />
            ) : (
              <DefaultPanel />
            )}
          </div>
        </div>
      </PersistGate>
    </Provider>
  );
};

export default SidebarApp;
