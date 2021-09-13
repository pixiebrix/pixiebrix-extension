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
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import useInstallState from "@/devTools/editor/hooks/useInstallState";
import InstalledEntry from "@/devTools/editor/sidebar/InstalledEntry";
import DynamicEntry from "@/devTools/editor/sidebar/DynamicEntry";
import { isExtension } from "@/devTools/editor/sidebar/common";
import useAddElement from "@/devTools/editor/hooks/useAddElement";
import Footer from "@/devTools/editor/sidebar/Footer";
import useReservedNames from "@/devTools/editor/hooks/useReservedNames";
import { Except } from "type-fest";

const DropdownEntry: React.FunctionComponent<{
  caption: string;
  icon: IconProp;
  onClick: () => void;
  beta?: boolean;
}> = ({ beta, icon, caption, onClick }) => (
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

const Sidebar: React.FunctionComponent<
  Except<EditorState, "error" | "dirty" | "knownEditable" | "selectionSeq" | "isBetaUI"> & {
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

  const elementHash = hash(sortBy(elements.map((formState) => formState.uuid)));
  const entries = useMemo(
    () => {
      const elementIds = new Set(elements.map((formState) => formState.uuid));
      const entries = [
        ...elements.filter(
          (formState) =>
            showAll ||
            availableDynamicIds?.has(formState.uuid) ||
            activeElement === formState.uuid
        ),
        ...installed.filter(
          (extension) =>
            !elementIds.has(extension.id) &&
            (showAll || installedIds?.includes(extension.extensionPointId))
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

  return (
    <div className="Sidebar d-flex flex-column vh-100">
      <div className="Sidebar__actions flex-grow-0">
        <div className="d-inline-flex flex-wrap">
          <a
            href="/options.html"
            target="_blank"
            title="Open PixieBrix Options"
          >
            <img src={logoUrl} alt="" width={31} height={31} />
          </a>
          <DropdownButton
            disabled={Boolean(inserting) || !hasPermissions}
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
          {unavailableCount ? (
            <div className="my-auto">
              <Form.Check
                type="checkbox"
                label={`Show ${unavailableCount} unavailable`}
                defaultChecked={showAll}
                onChange={(event: FormEvent<HTMLInputElement>) => {
                  setShowAll(event.currentTarget.checked);
                }}
              />
            </div>
          ) : null}
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
