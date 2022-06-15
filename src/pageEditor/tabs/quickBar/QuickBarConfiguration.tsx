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
import MultiSelectWidget from "@/pageEditor/fields/MultiSelectWidget";
import { makeLockableFieldProps } from "@/pageEditor/fields/makeLockableFieldProps";
import { contextOptions } from "@/pageEditor/tabs/contextMenu/ContextMenuConfiguration";
import IconWidget from "@/components/fields/IconWidget";
import ExtraPermissionsSection from "@/pageEditor/tabs/ExtraPermissionsSection";

const QuickBarConfiguration: React.FC<{
  isLocked: boolean;
}> = ({ isLocked = false }) => (
  <Card>
    <FieldSection title="Configuration">
      <ConnectedFieldTemplate
        name="extension.title"
        label="Action Title"
        description="Quick Bar action title"
      />

      <ConnectedFieldTemplate
        name="extensionPoint.definition.contexts"
        as={MultiSelectWidget}
        options={contextOptions}
        description={
          <span>
            One or more contexts to include the quick bar item. For example, use
            the <code>selection</code> context to show the action item when text
            is selected.
          </span>
        }
        {...makeLockableFieldProps("Contexts", isLocked)}
      />

      <UrlMatchPatternField
        name="extensionPoint.definition.documentUrlPatterns"
        {...makeLockableFieldProps("Sites", isLocked)}
        description={
          <span>
            URL match patterns to show the menu item on. See{" "}
            <a
              href="https://developer.chrome.com/docs/extensions/mv2/match_patterns/"
              target="_blank"
              rel="noreferrer"
            >
              <code>match_patterns</code> Documentation
            </a>{" "}
            for examples.
          </span>
        }
      />
    </FieldSection>

    <FieldSection title="Advanced">
      <ConnectedFieldTemplate
        name="extension.icon"
        label="Icon"
        as={IconWidget}
        description="Icon to show in the menu"
      />

      <ConnectedFieldTemplate
        name="extensionPoint.definition.targetMode"
        as="select"
        title="Target Mode"
        blankValue="eventTarget"
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
      </ConnectedFieldTemplate>

      <UrlMatchPatternField
        name="extensionPoint.definition.isAvailable.matchPatterns"
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

    <ExtraPermissionsSection />
  </Card>
);

export default QuickBarConfiguration;
