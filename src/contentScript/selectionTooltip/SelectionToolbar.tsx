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
// We're rendering in the shadow DOM, so we need to load styles as a URL. loadAsUrl doesn't work with module mangling
import stylesUrl from "@/contentScript/selectionTooltip/SelectionToolbar.scss?loadAsUrl";
import type ActionRegistry from "@/contentScript/selectionTooltip/ActionRegistry";
import type { RegisteredAction } from "@/contentScript/selectionTooltip/ActionRegistry";
import Icon from "@/icons/Icon";
import { splitStartingEmoji } from "@/utils/stringUtils";
import { truncate } from "lodash";
import useDocumentSelection from "@/hooks/useDocumentSelection";
import type { Nullishable } from "@/utils/nullishUtils";
import useActionRegistry from "@/contentScript/selectionTooltip/useActionRegistry";
import { Stylesheets } from "@/components/Stylesheets";
import EmotionShadowRoot from "react-shadow/emotion";

// "Every property exists" (via Proxy), TypeScript doesn't offer such type
// Also strictNullChecks config mismatch
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion
const ShadowRoot = EmotionShadowRoot.div!;

const ICON_SIZE_PX = 16;

type ActionCallbacks = {
  onHide: () => void;
};

function selectButtonTitle(
  title: string,
  selection: Nullishable<string>,
  {
    selectionPreviewLength = 10,
  }: {
    selectionPreviewLength?: number;
  } = {},
): string {
  const text = splitStartingEmoji(title).rest;
  // Chrome uses %s as selection placeholder, which is confusing to users. We might instead show a preview of
  // the selected text here.
  const selectionText = truncate(selection ?? "", {
    length: selectionPreviewLength,
    omission: "…",
  });
  return text.replace("%s", selectionText);
}

const ToolbarItem: React.FC<
  RegisteredAction & ActionCallbacks & { selection: Nullishable<string> }
> = ({ selection, title, handler, emoji, icon, onHide }) => (
  <button
    role="menuitem"
    className="toolbarItem"
    style={{
      // Keep emoji and icon height consistent
      fontSize: `${ICON_SIZE_PX}px`,
    }}
    title={selectButtonTitle(title, selection)}
    onClick={() => {
      const selection = window.getSelection();
      if (selection) {
        handler(selection.toString());
        onHide();
      }
    }}
  >
    {emoji ?? <Icon {...icon} size={ICON_SIZE_PX} />}
  </button>
);

const SelectionToolbar: React.FC<
  { registry: ActionRegistry } & ActionCallbacks
> = ({ registry, onHide }) => {
  const selection = useDocumentSelection();
  const actions = useActionRegistry(registry);

  // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/menu_role
  return (
    <ShadowRoot mode="open">
      <Stylesheets href={[stylesUrl]}>
        <div
          role="menu"
          aria-orientation="horizontal"
          aria-label="Text selection menu"
          className="toolbar"
        >
          {[...actions.entries()].map(([id, action]) => (
            <ToolbarItem
              key={id}
              {...action}
              onHide={onHide}
              selection={selection}
            />
          ))}
        </div>
      </Stylesheets>
    </ShadowRoot>
  );
};

export default SelectionToolbar;
