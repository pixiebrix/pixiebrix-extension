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

import React, { Dispatch, useEffect, useMemo } from "react";
import { Button } from "react-bootstrap";
import logo from "@img/logo.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDoubleRight, faCog } from "@fortawesome/free-solid-svg-icons";
import {
  addListener,
  removeListener,
  SidebarListener,
} from "@/sidebar/protocol";
import DefaultPanel from "@/sidebar/DefaultPanel";
import store, { persistor } from "@/sidebar/store";
import { Provider, useDispatch, useSelector } from "react-redux";
import Loader from "@/components/Loader";
import { PersistGate } from "redux-persist/integration/react";
import { FormEntry, PanelEntry } from "@/sidebar/types";
import Tabs from "@/sidebar/Tabs";
import sidebarSlice, { SidebarState } from "./sidebarSlice";
import { AnyAction } from "redux";
import { hideSidebar } from "@/contentScript/messenger/api";
import { whoAmI } from "@/background/messenger/api";

/**
 * Listeners to update the Sidebar's Redux state upon receiving messages from the contentScript.
 */
function getConnectedListener(dispatch: Dispatch<AnyAction>): SidebarListener {
  return {
    onRenderPanels(panels: PanelEntry[]) {
      dispatch(sidebarSlice.actions.setPanels({ panels }));
    },
    onShowForm(form: FormEntry) {
      dispatch(sidebarSlice.actions.addForm({ form }));
    },
    onHideForm({ nonce }: Partial<FormEntry>) {
      dispatch(sidebarSlice.actions.removeForm(nonce));
    },
  };
}

const selectState = ({ sidebar }: { sidebar: SidebarState }) => sidebar;

const ConnectedSidebar: React.VFC = () => {
  const dispatch = useDispatch();
  const sidebarState = useSelector(selectState);

  const listener: SidebarListener = useMemo(
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
          <img src={logo} alt="PixieBrix logo" height={20} className="px-4" />
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
        {sidebarState.panels?.length || sidebarState.forms?.length ? (
          <Tabs
            {...sidebarState}
            onSelectTab={(eventKey: string) => {
              dispatch(sidebarSlice.actions.selectTab(eventKey));
            }}
          />
        ) : (
          <DefaultPanel />
        )}
      </div>
    </div>
  );
};

const SidebarApp: React.VFC = () => (
  <Provider store={store}>
    <PersistGate loading={<Loader />} persistor={persistor}>
      <ConnectedSidebar />
    </PersistGate>
  </Provider>
);

export default SidebarApp;
