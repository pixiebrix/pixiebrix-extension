/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import React, { useCallback, useContext, useMemo, useState } from "react";
import { Container } from "react-bootstrap";
import Sidebar from "@/devTools/editor/sidebar/Sidebar";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/devTools/store";
import SplitPane from "react-split-pane";
import { cancelSelectElement } from "@/background/devtools";
import { DevToolsContext } from "@/devTools/context";
import { selectInstalledExtensions } from "@/options/selectors";
import PermissionsPane from "@/devTools/editor/panes/PermissionsPane";
import BetaPane from "@/devTools/editor/panes/BetaPane";
import SupportWidget from "@/devTools/editor/panes/SupportWidget";
import InsertMenuItemPane from "@/devTools/editor/panes/insert/InsertMenuItemPane";
import InsertPanelPane from "@/devTools/editor/panes/insert/InsertPanelPane";
import NoExtensionSelectedPane from "@/devTools/editor/panes/NoExtensionsSelectedPane";
import NoExtensionsPane from "@/devTools/editor/panes/NoExtensionsPane";
import WelcomePane from "@/devTools/editor/panes/WelcomePane";
import EditorPane from "@/devTools/editor/panes/EditorPane";
import useInstallState from "@/devTools/editor/hooks/useInstallState";
import useEscapeHandler from "@/devTools/editor/hooks/useEscapeHandler";
import GenericInsertPane from "@/devTools/editor/panes/insert/GenericInsertPane";
import { ADAPTERS } from "@/devTools/editor/extensionPoints/adapter";
import useReservedNames from "@/devTools/editor/hooks/useReservedNames";
import { actions } from "@/devTools/editor/editorSlice";

const selectEditor = ({ editor }: RootState) => editor;

const DEFAULT_SIDEBAR_WIDTH_PX = 260;

const Editor: React.FunctionComponent = () => {
  const { tabState, port, connecting } = useContext(DevToolsContext);
  const installed = useSelector(selectInstalledExtensions);
  const dispatch = useDispatch();

  const [showChat, setShowChat] = useState<boolean>(false);
  const showSupport = useCallback(() => {
    setShowChat(true);
  }, [setShowChat]);
  const hideSupport = useCallback(() => {
    setShowChat(false);
  }, [setShowChat]);

  const {
    selectionSeq,
    inserting,
    elements,
    activeElement,
    error,
    beta,
  } = useSelector(selectEditor);

  const selectedElement = useMemo(
    () =>
      activeElement ? elements.find((x) => x.uuid === activeElement) : null,
    [elements, activeElement]
  );

  const cancelInsert = useCallback(async () => {
    dispatch(actions.toggleInsert(null));
    await cancelSelectElement(port);
  }, [port, dispatch]);

  useEscapeHandler(cancelInsert, inserting != null);

  const reservedNames = useReservedNames(elements);

  const { availableDynamicIds, unavailableCount } = useInstallState(
    installed,
    elements
  );

  const body = useMemo(() => {
    if (tabState.hasPermissions === false && !connecting) {
      // Check `connecting` to optimistically show the main interface while the devtools are connecting to the page.
      return <PermissionsPane />;
    }

    if (error && beta) {
      return <BetaPane />;
    }

    if (inserting) {
      switch (inserting) {
        case "menuItem":
          return <InsertMenuItemPane cancel={cancelInsert} />;
        case "panel":
          return <InsertPanelPane cancel={cancelInsert} />;
        default:
          return (
            <GenericInsertPane
              cancel={cancelInsert}
              config={ADAPTERS.get(inserting)}
              reservedNames={reservedNames}
            />
          );
      }
    } else if (error) {
      return (
        <div className="p-2">
          <span className="text-danger">{error}</span>
        </div>
      );
    } else if (selectedElement) {
      return (
        <EditorPane
          selectedElement={selectedElement}
          toggleChat={setShowChat}
          selectionSeq={selectionSeq}
        />
      );
    } else if (
      availableDynamicIds?.size ||
      installed.length > unavailableCount
    ) {
      return <NoExtensionSelectedPane />;
    } else if (installed.length > 0) {
      return (
        <NoExtensionsPane
          unavailableCount={unavailableCount}
          showSupport={showSupport}
        />
      );
    } else {
      return <WelcomePane showSupport={showSupport} />;
    }
  }, [
    connecting,
    beta,
    cancelInsert,
    inserting,
    selectedElement,
    error,
    installed,
    selectionSeq,
    showSupport,
    availableDynamicIds?.size,
    unavailableCount,
    tabState,
    reservedNames,
  ]);

  return (
    <Container fluid className="h-100">
      <SplitPane
        split="vertical"
        allowResize
        minSize={DEFAULT_SIDEBAR_WIDTH_PX}
        defaultSize={DEFAULT_SIDEBAR_WIDTH_PX}
      >
        <Sidebar
          installed={installed}
          elements={elements}
          activeElement={activeElement}
          inserting={inserting}
        />
        <div className="d-flex h-100">
          <div className="h-100 flex-grow-1">{body}</div>
          {showChat && (
            <div className="SupportPane h-100">
              <SupportWidget onClose={hideSupport} />
            </div>
          )}
        </div>
      </SplitPane>
    </Container>
  );
};

export default Editor;
