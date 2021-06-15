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
import { Alert, Button, Container } from "react-bootstrap";
import { browser } from "webextension-polyfill-ts";
import { Formik, FormikValues } from "formik";
import ElementWizard from "@/devTools/editor/ElementWizard";
import {
  EditorState,
  editorSlice,
  FormState,
} from "@/devTools/editor/editorSlice";
import { EditablePackage, useCreate } from "@/devTools/editor/useCreate";
import Sidebar, { useInstallState } from "@/devTools/editor/Sidebar";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/devTools/store";
import { useDebounce, useDebouncedCallback } from "use-debounce";
import SplitPane from "react-split-pane";
import { isEqual, zip } from "lodash";
import { useAsyncState } from "@/hooks/common";
import axios from "axios";
import { makeURL } from "@/hooks/fetch";
import { getExtensionToken } from "@/auth/token";
import {
  faCommentAlt,
  faExternalLinkAlt,
  faInfo,
  faPhone,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  cancelSelectElement,
  checkAvailable,
  getTabInfo,
} from "@/background/devtools/index";
import { DevToolsContext } from "@/devTools/context";
import { sleep } from "@/utils";
import Centered from "@/devTools/editor/components/Centered";
import { openTab } from "@/background/executor";
import ErrorBoundary from "@/components/ErrorBoundary";
import ChatWidget from "@/components/ChatWidget";
import BlockModal from "@/components/fields/BlockModal";
import extensionPointRegistry from "@/extensionPoints/registry";
import {
  PanelDefinition,
  PanelExtensionPoint,
} from "@/extensionPoints/panelExtension";
import { makePanelExtensionFormState } from "@/devTools/editor/extensionPoints/panel";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import {
  MenuDefinition,
  MenuItemExtensionPoint,
} from "@/extensionPoints/menuItemExtension";
import { IExtensionPoint } from "@/core";
import { makeActionExtensionFormState } from "@/devTools/editor/extensionPoints/menuItem";
import { selectInstalledExtensions } from "@/options/selectors";

const { updateElement, addElement } = editorSlice.actions;

const Effect: React.FunctionComponent<{
  values: FormikValues;
  onChange: (values: FormikValues) => void;
}> = ({ values, onChange }) => {
  const [prev, setPrev] = useState(values);
  // debounce a bit, because isEqual is not inexpensive
  const [debounced] = useDebounce(values, 25, {
    leading: true,
    trailing: true,
  });
  useEffect(() => {
    // Formik changing the reference, so can't use reference equality here
    if (!isEqual(prev, debounced)) {
      onChange(debounced);
      setPrev(debounced);
    }
  }, [prev, setPrev, debounced, onChange]);
  return null;
};

const BetaPane = () => {
  return (
    <Centered>
      <div className="PaneTitle">
        This Page Editor feature is currently in private beta
      </div>

      <div className="text-left">
        <p>
          To request access, contact{" "}
          <a href="mailto:support@pixiebrix.com">support@pixiebrix.com</a>
        </p>

        <p>
          In the meantime, you can create extensions that depend on this feature
          in the Workshop.
        </p>
      </div>
    </Centered>
  );
};

const PermissionsPane = () => {
  const { port, connect } = useContext(DevToolsContext);

  const requestPermissions = useCallback(() => {
    // Firefox browser.permissions.request gets confused by async code. Must use normal promises in the
    // call path to browser.permissions.request so it knows it was triggered by a user action
    getTabInfo(port).then(({ url }) => {
      const requestPromise = browser.permissions.request({ origins: [url] });
      requestPromise.then(async () => {
        await sleep(500);
        await connect();
      });
    });
  }, [connect, port]);

  return (
    <Centered>
      <div className="PaneTitle">
        PixieBrix does not have access to the page
      </div>
      <div className="mb-2 text-left">
        <p>
          Grant permanent access to this domain by clicking the button below.
        </p>

        <p>
          Or, grant temporary access by 1) clicking on the PixieBrix extension
          in the extensions dropdown, and 2) then refreshing the page.
        </p>
      </div>
      <Button onClick={requestPermissions}>Grant Permanent Access</Button>
    </Centered>
  );
};

type MenuItemWithConfig = MenuItemExtensionPoint & {
  rawConfig: ExtensionPointConfig<MenuDefinition>;
};

// we want Function to pass in the CTOR
// eslint-disable-next-line @typescript-eslint/ban-types
function useAvailableExtensionPoints<
  TConfig extends IExtensionPoint & { rawConfig: ExtensionPointConfig }
>(ctor: Function) {
  const { port } = useContext(DevToolsContext);

  const [availableExtensionPoints, , error] = useAsyncState(async () => {
    const all = await extensionPointRegistry.all();
    const validExtensionPoints = all.filter(
      (x) => x instanceof ctor && (x as TConfig).rawConfig != null
    ) as TConfig[];
    const availability = await Promise.allSettled(
      validExtensionPoints.map((x) =>
        checkAvailable(port, x.rawConfig.definition.isAvailable ?? {})
      )
    );
    console.debug("useAvailableExtensionPoints", {
      all,
      validExtensionPoints,
      availability,
    });
    return zip(validExtensionPoints, availability)
      .filter(
        ([, availability]) =>
          availability.status === "fulfilled" && availability.value === true
      )
      .map(([extensionPoint]) => extensionPoint);
  }, [port]);

  if (error) {
    console.warn("useAvailableExtensionPoints", { error });
  }

  return availableExtensionPoints;
}

const InsertButtonPane: React.FunctionComponent<{ cancel: () => void }> = ({
  cancel,
}) => {
  const dispatch = useDispatch();
  const { port } = useContext(DevToolsContext);

  const addExistingButton = useCallback(
    async (extensionPoint: MenuItemWithConfig) => {
      cancel();
      if (!("rawConfig" in extensionPoint)) {
        throw new Error(
          "Cannot use menuItem extension point without config in the Page Editor"
        );
      }
      const { url } = await getTabInfo(port);
      const state = await makeActionExtensionFormState(
        url,
        extensionPoint.rawConfig
      );
      dispatch(addElement(state));
    },
    [dispatch, cancel]
  );

  const menuItemExtensionPoints = useAvailableExtensionPoints(
    MenuItemExtensionPoint
  );

  return (
    <Centered>
      <div className="PaneTitle">Inserting button</div>

      <div className="text-left">
        <p>
          Click on an existing <code>button</code> or button-like element to add
          a button that that button group. You can also select a menu item or
          nav link.
        </p>

        <div>
          <Alert variant="info">
            <FontAwesomeIcon icon={faInfo} /> <b>Tip:</b> to increase the
            accuracy of detection, you can Shift+Click one or more buttons in
            the button group. Click a button without holding Shift to complete
            placement.
          </Alert>
        </div>
      </div>
      <div>
        <BlockModal
          blocks={menuItemExtensionPoints ?? []}
          caption="Select button foundation"
          renderButton={({ show }) => (
            <Button
              variant="info"
              onClick={show}
              disabled={!menuItemExtensionPoints?.length}
            >
              Add Existing Button
            </Button>
          )}
          onSelect={(block) => addExistingButton(block as MenuItemWithConfig)}
        />

        <Button variant="danger" className="ml-2" onClick={cancel}>
          Cancel Insert
        </Button>
      </div>
    </Centered>
  );
};

type PanelWithConfig = PanelExtensionPoint & {
  rawConfig: ExtensionPointConfig<PanelDefinition>;
};

const InsertPanelPane: React.FunctionComponent<{
  cancel: () => void;
}> = ({ cancel }) => {
  const dispatch = useDispatch();
  const { port } = useContext(DevToolsContext);

  const panelExtensionPoints = useAvailableExtensionPoints(PanelExtensionPoint);

  const addExistingPanel = useCallback(
    async (extensionPoint: PanelWithConfig) => {
      cancel();
      if (!("rawConfig" in extensionPoint)) {
        throw new Error(
          "Cannot use panel extension point without config in the Page Editor"
        );
      }
      const { url } = await getTabInfo(port);
      const state = await makePanelExtensionFormState(
        url,
        extensionPoint.rawConfig
      );
      dispatch(addElement(state));
    },
    [dispatch, cancel]
  );

  return (
    <Centered>
      <div className="PaneTitle">Inserting panel</div>

      <div className="text-left">
        <p>Click on a container to insert a panel in that container.</p>
      </div>
      <div>
        <BlockModal
          blocks={panelExtensionPoints ?? []}
          caption="Select panel foundation"
          renderButton={({ show }) => (
            <Button
              variant="info"
              onClick={show}
              disabled={!panelExtensionPoints?.length}
            >
              Add Existing Panel
            </Button>
          )}
          onSelect={(block) => addExistingPanel(block as PanelWithConfig)}
        />

        <Button className="ml-2" variant="danger" onClick={cancel}>
          Cancel Insert
        </Button>
      </div>
    </Centered>
  );
};

const NoExtensionsPane: React.FunctionComponent<{
  unavailableCount: number;
  showSupport: () => void;
}> = ({ unavailableCount, showSupport }) => {
  return (
    <Centered>
      <div className="PaneTitle">No custom extensions on the page</div>

      <div className="text-left">
        <p>
          Click <span className="text-info">Add</span> in the sidebar to add an
          element to the page.
        </p>

        <p>
          Check the &ldquo;Show {unavailableCount ?? 1} unavailable&rdquo; box
          to list extensions that are installed but aren&apos;t available for
          this page.
        </p>

        <p>
          Learn how to use the Page Editor in our{" "}
          <a
            href="#"
            onClick={async () =>
              openTab({
                url: "https://docs.pixiebrix.com/quick-start-guide",
                active: true,
              })
            }
          >
            Quick Start Guide
          </a>
        </p>

        <div className="text-center">
          <Button variant="info" onClick={showSupport}>
            <FontAwesomeIcon icon={faCommentAlt} /> Live Chat Support
          </Button>

          <Button
            className="ml-2"
            variant="info"
            onClick={async () =>
              openTab({
                url: "https://calendly.com/pixiebrix-todd/live-support-session",
                active: true,
              })
            }
          >
            <FontAwesomeIcon icon={faPhone} /> Schedule FREE Zoom Session
          </Button>
        </div>
      </div>
    </Centered>
  );
};

const WelcomePane: React.FunctionComponent<{ showSupport: () => void }> = ({
  showSupport,
}) => {
  return (
    <Centered>
      <div className="PaneTitle">Welcome to the PixieBrix Page Editor!</div>

      <div className="text-left">
        <p>Click Add in the sidebar to add an element to the page.</p>

        <p>
          Learn how to use the Page Editor in our{" "}
          <a
            href="#"
            onClick={async () =>
              openTab({
                url: "https://docs.pixiebrix.com/quick-start-guide",
                active: true,
              })
            }
          >
            Quick Start Guide
          </a>
        </p>

        <div className="text-center">
          <Button variant="info" onClick={showSupport}>
            <FontAwesomeIcon icon={faCommentAlt} /> Live Chat Support
          </Button>

          <Button
            className="ml-2"
            variant="info"
            onClick={async () =>
              openTab({
                url: "https://calendly.com/pixiebrix-todd/live-support-session",
                active: true,
              })
            }
          >
            <FontAwesomeIcon icon={faPhone} /> Schedule FREE Zoom Session
          </Button>
        </div>
      </div>
    </Centered>
  );
};

const NoExtensionSelectedPane = () => {
  return (
    <Centered>
      <div className="PaneTitle">No extension selected</div>

      <div className="text-left">
        <p>Select an extension in the sidebar to edit</p>
        <p>
          Or, click the <span className="text-info">Add</span> button in the
          sidebar to add an extension to the page.
        </p>
      </div>
    </Centered>
  );
};

const SupportWidget: React.FunctionComponent<{ onClose: () => void }> = ({
  onClose,
}) => {
  return (
    <div className="d-flex flex-column h-100">
      <div className="d-flex pl-2">
        <div className="flex-grow-1">
          <div className="small">
            <span className="text-muted">
              <FontAwesomeIcon icon={faPhone} />
            </span>{" "}
            <a
              href="#"
              onClick={async () =>
                openTab({
                  url:
                    "https://calendly.com/pixiebrix-todd/live-support-session",
                  active: true,
                })
              }
            >
              Schedule FREE Zoom session
            </a>
          </div>
          <div className="small">
            <span className="text-muted">
              <FontAwesomeIcon icon={faExternalLinkAlt} />{" "}
            </span>
            <a
              href="#"
              onClick={async () =>
                openTab({
                  url: "https://docs.pixiebrix.com/",
                  active: true,
                })
              }
            >
              Open Documentation
            </a>
          </div>
        </div>
        <div className="pr-2 text-muted">
          <span onClick={() => onClose()} role="button">
            <FontAwesomeIcon icon={faTimes} />
          </span>
        </div>
      </div>
      <div className="flex-grow-1">
        <ChatWidget />
      </div>
    </div>
  );
};

const selectEditor = (x: RootState) => x.editor;

const Editor: React.FunctionComponent = () => {
  const { tabState, port } = useContext(DevToolsContext);
  const dispatch = useDispatch();
  const installed = useSelector(selectInstalledExtensions);

  const [showChat, setShowChat] = useState<boolean>(false);

  const {
    selectionSeq,
    inserting,
    elements,
    activeElement,
    error,
    knownEditable,
    beta,
  } = useSelector<RootState, EditorState>(selectEditor);

  const updateHandler = useDebouncedCallback(
    (values: FormState) => {
      dispatch(updateElement(values));
    },
    100,
    { trailing: true, leading: false }
  );

  const selectedElement = useMemo(() => {
    return activeElement
      ? elements.find((x) => x.uuid === activeElement)
      : null;
  }, [elements, activeElement]);

  const create = useCreate();

  const [initialEditable] = useAsyncState(async () => {
    const { data } = await axios.get<EditablePackage[]>(
      await makeURL("api/bricks/"),
      {
        headers: { Authorization: `Token ${await getExtensionToken()}` },
      }
    );
    console.debug("Fetch editable bricks", { editable: initialEditable });
    return new Set(data.map((x) => x.name));
  }, []);

  const editable = useMemo<Set<string>>(() => {
    const rv = new Set<string>(initialEditable ?? new Set());
    for (const x of knownEditable) {
      rv.add(x);
    }
    return rv;
  }, [initialEditable, knownEditable]);

  const cancelInsert = useCallback(async () => {
    await cancelSelectElement(port);
  }, [port]);

  const { availableDynamicIds, unavailableCount } = useInstallState(
    installed,
    elements
  );

  const escapeHandler = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
        cancelInsert();
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

  const body = useMemo(() => {
    if (tabState.hasPermissions === false) {
      return <PermissionsPane />;
    } else if (error && beta) {
      return <BetaPane />;
    } else if (inserting === "menuItem") {
      return <InsertButtonPane cancel={cancelInsert} />;
    } else if (inserting === "panel") {
      return <InsertPanelPane cancel={cancelInsert} />;
    } else if (error) {
      return (
        <div className="p-2">
          <span className="text-danger">{error}</span>
        </div>
      );
    } else if (selectedElement) {
      const key = `${selectedElement.uuid}-${selectedElement.installed}-${selectionSeq}`;
      return (
        <ErrorBoundary key={key}>
          <Formik key={key} initialValues={selectedElement} onSubmit={create}>
            {({ values }) => (
              <>
                <Effect values={values} onChange={updateHandler.callback} />
                <ElementWizard
                  element={values}
                  editable={editable}
                  installed={installed}
                  toggleChat={setShowChat}
                />
              </>
            )}
          </Formik>
        </ErrorBoundary>
      );
    } else if (
      availableDynamicIds?.size ||
      installed.length > unavailableCount
    ) {
      return <NoExtensionSelectedPane />;
    } else if (installed.length) {
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
    updateHandler.callback,
    create,
    inserting,
    selectedElement,
    error,
    editable,
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
