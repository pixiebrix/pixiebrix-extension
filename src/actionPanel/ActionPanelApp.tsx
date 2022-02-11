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

import styles from "./ActionPanelApp.module.scss";

import React, { Dispatch, useEffect, useMemo, useReducer } from "react";
import { Button } from "react-bootstrap";
import logo from "@img/logo.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDoubleRight, faCog } from "@fortawesome/free-solid-svg-icons";
import { getStore } from "@/actionPanel/native";
import {
  addListener,
  removeListener,
  StoreListener,
} from "@/actionPanel/protocol";
import DefaultActionPanel from "@/actionPanel/DefaultActionPanel";
import { ToastProvider } from "react-toast-notifications";
import store, { persistor } from "@/options/store";
import { Provider } from "react-redux";
import GridLoader from "react-spinners/GridLoader";
import { PersistGate } from "redux-persist/integration/react";
import { PanelEntry, FormEntry } from "@/actionPanel/actionPanelTypes";
import ActionPanelTabs from "@/actionPanel/ActionPanelTabs";
import slice, { blankActionPanelState } from "./actionPanelSlice";
import { AnyAction } from "redux";
import { hideActionPanel } from "@/contentScript/messenger/api";
import { whoAmI } from "@/background/messenger/api";
import cx from "classnames";

function getConnectedListener(dispatch: Dispatch<AnyAction>): StoreListener {
  return {
    onRenderPanels: (panels: PanelEntry[]) => {
      dispatch(slice.actions.setPanels({ panels }));
    },
    onShowForm: (form: FormEntry) => {
      dispatch(slice.actions.addForm({ form }));
    },
    onHideForm: ({ nonce }: Partial<FormEntry>) => {
      dispatch(slice.actions.removeForm(nonce));
    },
  };
}

const ActionPanelApp: React.FunctionComponent = () => {
  const [state, dispatch] = useReducer(slice.reducer, {
    ...blankActionPanelState,
    ...getStore(),
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
      // for PANEL_HIDING_EVENT. (and the only time this ActionPanelApp would unmount is if the sidebar was closing)
      removeListener(listener);
    };
  }, [listener]);

  return (
    <Provider store={store}>
      <PersistGate loading={<GridLoader />} persistor={persistor}>
        <ToastProvider>
          <div className="full-height">
            <div className="d-flex p-2 justify-content-between align-content-center">
              <Button
                className={styles.button}
                onClick={async () => {
                  const sidebar = await whoAmI();
                  await hideActionPanel({ tabId: sidebar.tab.id });
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
                className={cx(
                  styles.button,
                  "d-inline-flex align-items-center text-decoration-none"
                )}
              >
                <span>
                  Options <FontAwesomeIcon icon={faCog} />
                </span>
              </Button>
            </div>

            <div className="full-height">
              {state.panels?.length || state.forms?.length ? (
                <ActionPanelTabs
                  {...state}
                  onSelectTab={(eventKey: string) => {
                    dispatch(slice.actions.selectTab(eventKey));
                  }}
                />
              ) : (
                <DefaultActionPanel />
              )}
            </div>
          </div>
        </ToastProvider>
      </PersistGate>
    </Provider>
  );
};

export default ActionPanelApp;
