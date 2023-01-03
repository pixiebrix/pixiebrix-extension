/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import TemplateWidget, {
  type Snippet,
} from "@/pageEditor/fields/TemplateWidget";
import FieldSection from "@/pageEditor/fields/FieldSection";
import UrlMatchPatternField from "@/pageEditor/fields/UrlMatchPatternField";
import IconWidget from "@/components/fields/IconWidget";
import LocationWidget from "@/pageEditor/fields/LocationWidget";
import SelectWidget, {
  type Option,
} from "@/components/form/widgets/SelectWidget";
import { makeLockableFieldProps } from "@/pageEditor/fields/makeLockableFieldProps";
import MatchRulesSection from "@/pageEditor/tabs/MatchRulesSection";
import ExtraPermissionsSection from "@/pageEditor/tabs/ExtraPermissionsSection";
import { useField } from "formik";
import SwitchButtonWidget from "@/components/form/widgets/switchButton/SwitchButtonWidget";

const menuSnippets: Snippet[] = [
  { label: "caption", value: "{{{caption}}}" },
  { label: "icon", value: "{{{icon}}}" },
  { label: "space", value: "&nbsp;" },
];

const positionOptions: Option[] = [
  { value: "append", label: "End" },
  { value: "prepend", label: "Start" },
];

const MenuItemConfiguration: React.FC<{
  isLocked: boolean;
}> = ({ isLocked = false }) => {
  const [{ value: onSuccess }] = useField("extension.onSuccess");

  return (
    <Card>
      <FieldSection title="Configuration">
        <ConnectedFieldTemplate
          name="extension.caption"
          label="Caption"
          description="Button caption"
        />

        <ConnectedFieldTemplate
          name="extensionPoint.definition.containerSelector"
          as={LocationWidget}
          description="Location on the page"
          {...makeLockableFieldProps("Location", isLocked)}
        />

        <UrlMatchPatternField
          name="extensionPoint.definition.isAvailable.matchPatterns"
          {...makeLockableFieldProps("Sites", isLocked)}
        />
      </FieldSection>

      <FieldSection title="Advanced: Item Options">
        <ConnectedFieldTemplate
          name="extension.icon"
          label="Icon"
          as={IconWidget}
          description="Icon to place in the icon placeholder of the template"
        />

        <ConnectedFieldTemplate
          name="extensionPoint.definition.position"
          description="Position relative to other menu items/buttons"
          as={SelectWidget}
          blankValue={null}
          options={positionOptions}
          {...makeLockableFieldProps("Order/Position", isLocked)}
        />

        <ConnectedFieldTemplate
          name="extensionPoint.definition.template"
          as={TemplateWidget}
          description="A template for the item, with a placeholder for the caption and/or icon"
          snippets={menuSnippets}
          {...makeLockableFieldProps("Template", isLocked)}
        />

        <ConnectedFieldTemplate
          name="extensionPoint.definition.targetMode"
          as="select"
          title="Target Mode"
          blankValue="document"
          description={
            <p>
              Use&nbsp;<code>eventTarget</code> to pass the button element as
              the action root. Use&nbsp;
              <code>document</code> to pass the document as the action root.
            </p>
          }
          {...makeLockableFieldProps("Target Mode", isLocked)}
        >
          <option value="eventTarget">eventTarget</option>
          <option value="document">document</option>
        </ConnectedFieldTemplate>

        <ConnectedFieldTemplate
          name="extension.synchronous"
          label="Synchronous"
          as={SwitchButtonWidget}
          description="Prevent button to be clicked again while action is in progress"
          blankValue={false}
        />
        {(typeof onSuccess === "boolean" || onSuccess == null) && (
          // Punt on object-based configuration for now. Enterprise customers are just asking to turn off the message.
          // If they want a custom message they can add an alert brick.
          <ConnectedFieldTemplate
            name="extension.onSuccess"
            label="Show Success Message"
            as={SwitchButtonWidget}
            description="Show the default success message when run"
            blankValue={true}
          />
        )}
      </FieldSection>

      <MatchRulesSection isLocked={isLocked} />

      <ExtraPermissionsSection />
    </Card>
  );
};

export default MenuItemConfiguration;
