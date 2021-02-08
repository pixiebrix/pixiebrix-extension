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
  FormEvent,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  actions,
  EditorState,
  ElementType,
  FormState,
} from "@/devTools/editor/editorSlice";
import { DevToolsContext } from "@/devTools/context";
import { AuthContext } from "@/auth/context";
import { sortBy, zip, uniq } from "lodash";
import * as nativeOperations from "@/background/devtools/index";
import {
  checkAvailable,
  getInstalledExtensionPointIds,
  getTabInfo,
} from "@/background/devtools/index";
import {
  Badge,
  Dropdown,
  DropdownButton,
  Form,
  ListGroup,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faBolt,
  faColumns,
  faEyeSlash,
  faMousePointer,
  faPuzzlePiece,
  faSave,
} from "@fortawesome/free-solid-svg-icons";
import { useToasts } from "react-toast-notifications";
import { reportError } from "@/telemetry/logging";
import { generateExtensionPointMetadata } from "@/devTools/editor/extensionPoints/base";
import {
  makePanelConfig,
  makePanelState,
} from "@/devTools/editor/extensionPoints/panel";
import {
  makeActionConfig,
  makeActionState,
} from "@/devTools/editor/extensionPoints/menuItem";
import {
  makeTriggerConfig,
  makeTriggerState,
} from "@/devTools/editor/extensionPoints/trigger";
import { Runtime } from "webextension-polyfill-ts";
import { IExtension, Metadata } from "@/core";
import { FrameworkMeta } from "@/messaging/constants";
import { DynamicDefinition } from "@/nativeEditor";
import { useAsyncState } from "@/hooks/common";
import { useDispatch, useSelector } from "react-redux";
import {
  extensionToFormState,
  getType,
} from "@/devTools/editor/extensionPoints/adapter";
import { RootState } from "@/devTools/store";
import hash from "object-hash";
import logo from "@/icons/custom-icons/favicon.svg";
import { BeatLoader } from "react-spinners";
import { openExtensionOptions } from "@/messaging/external";
import {
  makeContextMenuConfig,
  makeContextMenuState,
} from "@/devTools/editor/extensionPoints/contextMenu";

interface ElementConfig<
  TResult = unknown,
  TState extends FormState = FormState
> {
  elementType: ElementType;
  preview?: boolean;
  label: string;
  insert: (port: Runtime.Port) => Promise<TResult>;
  makeState: (
    url: string,
    metadata: Metadata,
    element: TResult,
    frameworks: FrameworkMeta[]
  ) => TState;
  makeConfig: (state: TState) => DynamicDefinition;
}

const addElementDefinitions: Record<string, ElementConfig> = {
  button: {
    elementType: "menuItem",
    label: "Button",
    insert: nativeOperations.insertButton,
    makeState: makeActionState,
    makeConfig: makeActionConfig,
  },
  contextMenu: {
    elementType: "contextMenu",
    label: "Context Menu",
    insert: undefined,
    makeState: (
      url: string,
      metadata: Metadata,
      element: unknown,
      frameworks: FrameworkMeta[]
    ) => makeContextMenuState(url, metadata, frameworks),
    makeConfig: makeContextMenuConfig,
  },
  panel: {
    elementType: "panel",
    label: "Panel",
    insert: nativeOperations.insertPanel,
    makeState: makePanelState,
    makeConfig: makePanelConfig,
    preview: true,
  },
  trigger: {
    elementType: "trigger",
    label: "Trigger",
    insert: undefined,
    preview: true,
    makeState: (
      url: string,
      metadata: Metadata,
      element: unknown,
      frameworks: FrameworkMeta[]
    ) => makeTriggerState(url, metadata, frameworks),
    makeConfig: makeTriggerConfig,
  },
};

function useAddElement(
  config: ElementConfig,
  reservedNames: string[],
  flag: string = undefined
) {
  const dispatch = useDispatch();
  const { port, tabState } = useContext(DevToolsContext);
  const { scope, flags = [] } = useContext(AuthContext);
  const { addToast } = useToasts();

  return useCallback(async () => {
    if (flag && !flags.includes(flag)) {
      dispatch(actions.betaError({ error: "This feature is in private beta" }));
      return;
    }

    dispatch(actions.toggleInsert(config.elementType));

    try {
      const element = config.insert ? await config.insert(port) : null;
      const { url } = await getTabInfo(port);
      const metadata = await generateExtensionPointMetadata(
        config.label,
        scope,
        url,
        reservedNames
      );
      const initialState = config.makeState(
        url,
        metadata,
        element,
        tabState.meta.frameworks ?? []
      );
      await nativeOperations.updateDynamicElement(
        port,
        config.makeConfig(initialState)
      );
      dispatch(actions.addElement(initialState));
    } catch (exc) {
      if (!exc.toString().toLowerCase().includes("selection cancelled")) {
        reportError(exc);
        addToast(
          `Error adding ${config.label.toLowerCase()}: ${exc.toString()}`,
          {
            appearance: "error",
            autoDismiss: true,
          }
        );
      }
    } finally {
      dispatch(actions.toggleInsert(null));
    }
  }, [
    port,
    tabState.meta?.frameworks,
    reservedNames,
    scope,
    addToast,
    flag,
    flags,
  ]);
}

function getLabel(extension: FormState): string {
  return extension.label ?? extension.extensionPoint.metadata.name;
}

type SidebarItem = IExtension | FormState;

function isExtension(value: SidebarItem): value is IExtension {
  return "extensionPointId" in value;
}

const ICON_MAP = new Map([
  ["menuItem", faMousePointer],
  ["panel", faColumns],
  ["trigger", faBolt],
]);

const ExtensionIcon: React.FunctionComponent<{ type: string }> = ({ type }) => {
  return <FontAwesomeIcon icon={ICON_MAP.get(type) ?? faPuzzlePiece} />;
};

const InstalledEntry: React.FunctionComponent<{
  extension: IExtension;
  installedIds: string[];
  activeElement: string | null;
}> = ({ extension, installedIds, activeElement }) => {
  const dispatch = useDispatch();
  const [type] = useAsyncState(() => getType(extension), [
    extension.extensionPointId,
  ]);
  const available = installedIds?.includes(extension.extensionPointId);

  const selectInstalled = useCallback(
    async (extension: IExtension) => {
      try {
        const state = await extensionToFormState(extension);
        dispatch(actions.selectInstalled(state));
      } catch (error) {
        dispatch(actions.adapterError({ uuid: extension.id, error }));
      }
    },
    [dispatch]
  );

  return (
    <ListGroup.Item
      active={extension.id == activeElement}
      key={`installed-${extension.id}`}
      onClick={() => selectInstalled(extension)}
      style={{ cursor: "pointer" }}
    >
      <ExtensionIcon type={type} /> {extension.label ?? extension.id}
      {!available && (
        <span className="ml-2">
          <FontAwesomeIcon icon={faEyeSlash} title="Not available on page" />
        </span>
      )}
    </ListGroup.Item>
  );
};

const DynamicEntry: React.FunctionComponent<{
  item: FormState;
  port: Runtime.Port;
  available: boolean;
  activeElement: string | null;
}> = ({ port, item, available, activeElement }) => {
  const dispatch = useDispatch();

  const dirty = useSelector<RootState>(
    (x) => x.editor.dirty[item.uuid] ?? false
  );

  const toggle = useCallback(
    async (uuid: string, on: boolean) => {
      await nativeOperations.toggleOverlay(port, { uuid, on });
    },
    [port]
  );

  return (
    <ListGroup.Item
      active={item.uuid == activeElement}
      key={`dynamic-${item.uuid}`}
      onMouseEnter={() => toggle(item.uuid, true)}
      onMouseLeave={() => toggle(item.uuid, false)}
      onClick={() => dispatch(actions.selectElement(item.uuid))}
      style={{ cursor: "pointer" }}
    >
      <ExtensionIcon type={item.type} /> {getLabel(item)}
      {!available && (
        <span className="ml-2">
          <FontAwesomeIcon icon={faEyeSlash} title="Not available on page" />
        </span>
      )}
      {dirty && (
        <span className="text-danger ml-2">
          <FontAwesomeIcon icon={faSave} title="Has unsaved changes" />
        </span>
      )}
    </ListGroup.Item>
  );
};

function mapReservedNames(elements: FormState[]): string[] {
  return sortBy(
    uniq(
      elements.flatMap((x) => [
        x.extensionPoint.metadata.id,
        ...x.readers.map((x) => x.metadata.id),
      ])
    )
  );
}

export interface InstallState {
  installedIds: string[] | undefined;
  availableDynamicIds: Set<string> | undefined;
  unavailableCount: number | null;
}

export function useInstallState(
  installed: IExtension[],
  elements: FormState[]
): InstallState {
  const {
    port,
    tabState: { navSequence, meta },
  } = useContext(DevToolsContext);

  const [installedIds] = useAsyncState(async () => {
    if (meta) {
      return await getInstalledExtensionPointIds(port);
    } else {
      return [];
    }
  }, [port, navSequence, meta]);

  const [availableDynamicIds] = useAsyncState(async () => {
    if (meta) {
      const availability = await Promise.all(
        elements.map((element) =>
          checkAvailable(port, element.extensionPoint.definition.isAvailable)
        )
      );
      return new Set<string>(
        zip(elements, availability)
          .filter(([, available]) => available)
          .map(([extension]) => extension.uuid)
      );
    } else {
      return new Set<string>();
    }
  }, [
    port,
    meta,
    navSequence,
    hash(
      elements.map((x) => ({
        uuid: x.uuid,
        isAvailable: x.extensionPoint.definition.isAvailable,
      }))
    ),
  ]);

  const unavailableCount = useMemo(() => {
    if (meta) {
      if (installed && installedIds) {
        return installed.filter(
          (x) => !installedIds.includes(x.extensionPointId)
        ).length;
      } else {
        return null;
      }
    } else {
      return installed?.length;
    }
  }, [installed, navSequence, installedIds, meta]);

  return { installedIds, availableDynamicIds, unavailableCount };
}

const Sidebar: React.FunctionComponent<
  Omit<EditorState, "error" | "dirty" | "knownEditable" | "selectionSeq"> & {
    installed: IExtension[];
  }
> = ({ inserting, activeElement, installed, elements }) => {
  const context = useContext(DevToolsContext);
  const {
    port,
    connecting,
    tabState: { hasPermissions },
  } = context;
  const { scope } = useContext(AuthContext);
  const [showAll, setShowAll] = useState(false);

  const {
    installedIds,
    availableDynamicIds,
    unavailableCount,
  } = useInstallState(installed, elements);

  const entries = useMemo(() => {
    const elementIds = new Set(elements.map((x) => x.uuid));
    const entries = [
      ...elements.filter(
        (x) =>
          showAll ||
          availableDynamicIds?.has(x.uuid) ||
          activeElement === x.uuid
      ),
      ...installed.filter(
        (x) =>
          !elementIds.has(x.id) &&
          (showAll || installedIds?.includes(x.extensionPointId))
      ),
    ];
    return sortBy(entries, (x) => x.label);
  }, [
    installed,
    hash(sortBy(elements.map((x) => x.uuid))),
    availableDynamicIds,
    showAll,
    installedIds,
    activeElement,
  ]);

  const reservedNames = useMemo(() => mapReservedNames(elements), [
    hash(mapReservedNames(elements)),
  ]);
  const addButton = useAddElement(addElementDefinitions.button, reservedNames);
  const addContextMenu = useAddElement(
    addElementDefinitions.contextMenu,
    reservedNames
  );
  const addPanel = useAddElement(
    addElementDefinitions.panel,
    reservedNames,
    "pageeditor-panel"
  );
  const addTrigger = useAddElement(
    addElementDefinitions.trigger,
    reservedNames,
    "pageeditor-trigger"
  );

  return (
    <div className="Sidebar d-flex flex-column vh-100">
      <div className="Sidebar__actions flex-grow-0">
        <div className="d-inline-flex flex-wrap">
          <span
            className="Sidebar__logo"
            dangerouslySetInnerHTML={{ __html: logo }}
            onClick={() => openExtensionOptions()}
          />

          <DropdownButton
            disabled={!!inserting || !hasPermissions}
            variant="info"
            size="sm"
            title="Add"
            id="add-extension-point"
            className="mr-2 Sidebar__actions__dropdown"
          >
            <Dropdown.Item onClick={addButton}>
              <FontAwesomeIcon icon={faMousePointer} />
              &nbsp;Button
            </Dropdown.Item>
            <Dropdown.Item onClick={addContextMenu}>
              <FontAwesomeIcon icon={faBars} />
              &nbsp;Context Menu{" "}
              <Badge variant="success" pill>
                Beta
              </Badge>
            </Dropdown.Item>
            <Dropdown.Item onClick={addPanel}>
              <FontAwesomeIcon icon={faColumns} />
              &nbsp;Panel{" "}
              <Badge variant="success" pill>
                Beta
              </Badge>
            </Dropdown.Item>
            <Dropdown.Item onClick={addTrigger}>
              <FontAwesomeIcon icon={faBolt} />
              &nbsp;Trigger{" "}
              <Badge variant="success" pill>
                Beta
              </Badge>
            </Dropdown.Item>
          </DropdownButton>
          <div className="my-auto">
            <Form.Check
              type="checkbox"
              label={
                unavailableCount != null
                  ? `Show ${unavailableCount} unavailable`
                  : `Show unavailable`
              }
              defaultChecked={showAll}
              onChange={(e: FormEvent<HTMLInputElement>) => {
                setShowAll(e.currentTarget.checked);
              }}
            />
          </div>
        </div>
      </div>
      <div className="Sidebar__extensions flex-grow-1">
        <ListGroup>
          {entries.map((entry) =>
            isExtension(entry) ? (
              <InstalledEntry
                key={`installed-${entry.id}`}
                extension={entry}
                installedIds={installedIds}
                activeElement={activeElement}
              />
            ) : (
              <DynamicEntry
                key={`dynamic-${entry.uuid}`}
                item={entry}
                port={port}
                available={
                  !availableDynamicIds || availableDynamicIds?.has(entry.uuid)
                }
                activeElement={activeElement}
              />
            )
          )}
        </ListGroup>
      </div>
      <div className="Sidebar__footer flex-grow-0">
        <div className="d-flex">
          <div className="flex-grow-1">
            Scope: <code>{scope}</code>
          </div>
          <div>{connecting && <BeatLoader size={7} />}</div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
