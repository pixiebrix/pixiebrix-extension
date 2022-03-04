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

import React from "react";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { Card } from "react-bootstrap";
import FieldSection from "@/pageEditor/fields/FieldSection";
import UrlMatchPatternField from "@/pageEditor/fields/UrlMatchPatternField";
import TemplateWidget, { Snippet } from "@/pageEditor/fields/TemplateWidget";
import MultiSelectWidget from "@/pageEditor/fields/MultiSelectWidget";
import { makeLockableFieldProps } from "@/pageEditor/fields/makeLockableFieldProps";
import { DEFAULT_SHORTCUTS } from "@/pageEditor/components/UrlMatchPatternWidget";

const menuSnippets: Snippet[] = [{ label: "selected text", value: "%s" }];

export const contextOptions = [
  "page",
  "all",
  "frame",
  "selection",
  "link",
  "editable",
  "image",
  "video",
  "audio",
].map((value) => ({
  value,
  label: value,
}));

const matchPatternShortcuts = [
  { caption: "None", getPattern: async () => "" },
  ...DEFAULT_SHORTCUTS,
];

const ContextMenuConfiguration: React.FC<{
  isLocked: boolean;
}> = ({ isLocked = false }) => (
  <Card>
    <FieldSection title="Configuration">
      <ConnectedFieldTemplate
        name="extension.title"
        label="Title"
        as={TemplateWidget}
        rows={1}
        snippets={menuSnippets}
        description={
          <span>
            The context menu item caption. Use the <code>%s</code> placeholder
            to have the browser dynamically insert the current selection in the
            menu caption
          </span>
        }
      />

      <ConnectedFieldTemplate
        name="extensionPoint.definition.contexts"
        as={MultiSelectWidget}
        options={contextOptions}
        description={
          <span>
            One or more contexts to include the context menu item. For example,
            use the <code>selection</code> context to show the menu item when
            right-clicking selected text.
          </span>
        }
        {...makeLockableFieldProps("Contexts", isLocked)}
      />

      <UrlMatchPatternField
        name="extensionPoint.definition.documentUrlPatterns[0]"
        {...makeLockableFieldProps("Sites", isLocked)}
      />
    </FieldSection>

    <FieldSection title="Advanced">
      <ConnectedFieldTemplate
        name="extensionPoint.definition.targetMode"
        as="select"
        title="Target Mode"
        blankValue="legacy"
        description={
          <p>
            Use&nbsp;<code>eventTarget</code> to pass the target of the
            right-click as the action root. Use&nbsp;
            <code>document</code> to pass the document as the action root.
          </p>
        }
        {...makeLockableFieldProps("Target Mode", isLocked)}
      >
        <option value="eventTarget">eventTarget</option>
        <option value="document">document</option>
        <option value="legacy">legacy</option>
      </ConnectedFieldTemplate>

      <UrlMatchPatternField
        name="extensionPoint.definition.isAvailable.matchPatterns[0]"
        shortcuts={matchPatternShortcuts}
        description={
          <span>
            URL match patterns give PixieBrix access to a page without you first
            clicking the context menu. Including URLs here helps PixieBrix run
            you action quicker, and accurately detect which page element you
            clicked to invoke the context menu.
          </span>
        }
        {...makeLockableFieldProps("Automatic Permissions", isLocked)}
      />
    </FieldSection>
  </Card>
);

export default ContextMenuConfiguration;
