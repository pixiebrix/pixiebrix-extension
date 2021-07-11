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

import React, { FormEvent, useContext, useMemo, useState } from "react";
import { EditorState } from "@/devTools/editor/editorSlice";
import { DevToolsContext } from "@/devTools/context";
import { sortBy } from "lodash";
import {
  Badge,
  Dropdown,
  DropdownButton,
  Form,
  ListGroup,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IExtension } from "@/core";
import { ADAPTERS } from "@/devTools/editor/extensionPoints/adapter";
import hash from "object-hash";
import logoUrl from "@/icons/custom-icons/favicon.svg";
import { openExtensionOptions } from "@/messaging/external";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import useInstallState from "@/devTools/editor/hooks/useInstallState";
import InstalledEntry from "@/devTools/editor/sidebar/InstalledEntry";
import DynamicEntry from "@/devTools/editor/sidebar/DynamicEntry";
import { isExtension } from "@/devTools/editor/sidebar/common";
import useAddElement from "@/devTools/editor/hooks/useAddElement";
import Footer from "@/devTools/editor/sidebar/Footer";
import useReservedNames from "@/devTools/editor/hooks/useReservedNames";
import useSVG from "@/hooks/useSVG";

const DropdownEntry: React.FunctionComponent<{
  caption: string;
  icon: IconProp;
  onClick: () => void;
  beta?: boolean;
}> = ({ beta, icon, caption, onClick }) => {
  return (
    <Dropdown.Item onClick={onClick}>
      <FontAwesomeIcon icon={icon} />
      &nbsp;{caption}
      {beta && (
        <>
          {" "}
          <Badge variant="success" pill>
            Beta
          </Badge>
        </>
      )}
    </Dropdown.Item>
  );
};

const Sidebar: React.FunctionComponent<
  Omit<EditorState, "error" | "dirty" | "knownEditable" | "selectionSeq"> & {
    installed: IExtension[];
  }
> = ({ inserting, activeElement, installed, elements }) => {
  const context = useContext(DevToolsContext);
  const {
    port,
    tabState: { hasPermissions },
  } = context;

  const [showAll, setShowAll] = useState(false);

  const {
    installedIds,
    availableDynamicIds,
    unavailableCount,
  } = useInstallState(installed, elements);

  const elementHash = hash(sortBy(elements.map((x) => x.uuid)));
  const entries = useMemo(
    () => {
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- using elementHash to track element changes
    [
      installed,
      elementHash,
      availableDynamicIds,
      showAll,
      installedIds,
      activeElement,
    ]
  );

  const reservedNames = useReservedNames(elements);

  const addElement = useAddElement(reservedNames);

  const logo = useSVG(logoUrl);

  return (
    <div className="Sidebar d-flex flex-column vh-100">
      <div className="Sidebar__actions flex-grow-0">
        <div className="d-inline-flex flex-wrap">
          <span
            className="Sidebar__logo"
            dangerouslySetInnerHTML={{ __html: logo }}
            onClick={async () => openExtensionOptions()}
          />
          <DropdownButton
            disabled={!!inserting || !hasPermissions}
            variant="info"
            size="sm"
            title="Add"
            id="add-extension-point"
            className="mr-2 Sidebar__actions__dropdown"
          >
            {sortBy([...ADAPTERS.values()], (x) => x.displayOrder).map(
              (element) => (
                <DropdownEntry
                  key={element.elementType}
                  caption={element.label}
                  icon={element.icon}
                  beta={element.beta}
                  onClick={() => {
                    addElement(element);
                  }}
                />
              )
            )}
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
              onChange={(event: FormEvent<HTMLInputElement>) => {
                setShowAll(event.currentTarget.checked);
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
      <Footer />
    </div>
  );
};

export default Sidebar;
