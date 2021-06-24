/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Container } from "react-bootstrap";
import Sidebar from "@/devTools/editor/Sidebar";
import { useSelector } from "react-redux";
import { RootState } from "@/devTools/store";
import SplitPane from "react-split-pane";
import { cancelSelectElement } from "@/background/devtools";
import { DevToolsContext } from "@/devTools/context";
import { selectInstalledExtensions } from "@/options/selectors";
import PermissionsPane from "@/devTools/editor/panes/PermissionsPane";
import BetaPane from "@/devTools/editor/panes/BetaPane";
import SupportWidget from "@/devTools/editor/panes/SupportWidget";
import InsertMenuItemPane from "@/devTools/editor/panes/InsertMenuItemPane";
import InsertPanelPane from "@/devTools/editor/panes/InsertPanelPane";
import NoExtensionSelectedPane from "@/devTools/editor/panes/NoExtensionsSelectedPane";
import NoExtensionsPane from "@/devTools/editor/panes/NoExtensionsPane";
import WelcomePane from "@/devTools/editor/panes/WelcomePane";
import EditorPane from "@/devTools/editor/panes/EditorPane";
import useInstallState from "@/devTools/editor/hooks/useInstallState";

const selectEditor = (x: RootState) => x.editor;

function useEscapeHandler(cancelInsert: () => void, inserting: string) {
  const escapeHandler = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
        void cancelInsert();
      }
    },
    [cancelInsert]
  );

  useEffect(() => {
    // Needs to be the keydown event to prevent Google from opening the drawer
    if (inserting === "menuItem" || inserting === "panel") {
      document.addEventListener("keydown", escapeHandler, true);
    } else {
      document.removeEventListener("keydown", escapeHandler);
    }
    return () => document.removeEventListener("keydown", escapeHandler);
  }, [inserting, cancelInsert, escapeHandler]);
}

const Editor: React.FunctionComponent = () => {
  const { tabState, port } = useContext(DevToolsContext);
  const installed = useSelector(selectInstalledExtensions);

  const [showChat, setShowChat] = useState<boolean>(false);

  const {
    selectionSeq,
    inserting,
    elements,
    activeElement,
    error,
    beta,
  } = useSelector(selectEditor);

  const selectedElement = useMemo(() => {
    return activeElement
      ? elements.find((x) => x.uuid === activeElement)
      : null;
  }, [elements, activeElement]);

  const cancelInsert = useCallback(async () => cancelSelectElement(port), [
    port,
  ]);
  useEscapeHandler(cancelInsert, inserting);

  const { availableDynamicIds, unavailableCount } = useInstallState(
    installed,
    elements
  );

  const body = useMemo(() => {
    if (tabState.hasPermissions === false) {
      return <PermissionsPane />;
    } else if (error && beta) {
      return <BetaPane />;
    } else if (inserting === "menuItem") {
      return <InsertMenuItemPane cancel={cancelInsert} />;
    } else if (inserting === "panel") {
      return <InsertPanelPane cancel={cancelInsert} />;
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
          showSupport={() => setShowChat(true)}
        />
      );
    } else {
      return <WelcomePane showSupport={() => setShowChat(true)} />;
    }
  }, [
    beta,
    cancelInsert,
    inserting,
    selectedElement,
    error,
    installed,
    selectionSeq,
    availableDynamicIds?.size,
    unavailableCount,
    tabState,
  ]);

  return (
    <Container fluid className="h-100">
      <SplitPane split="vertical" allowResize minSize={260} defaultSize={260}>
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
              <SupportWidget onClose={() => setShowChat(false)} />
            </div>
          )}
        </div>
      </SplitPane>
    </Container>
  );
};

export default Editor;
