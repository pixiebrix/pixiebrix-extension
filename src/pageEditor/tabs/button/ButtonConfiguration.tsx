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
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import TemplateWidget, {
  type Snippet,
} from "@/pageEditor/fields/TemplateWidget";
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
import ConnectedCollapsibleFieldSection from "@/pageEditor/fields/ConnectedCollapsibleFieldSection";
import BooleanWidget from "@/components/fields/schemaFields/widgets/BooleanWidget";

const buttonSnippets: Snippet[] = [
  { label: "caption", value: "{{{caption}}}" },
  { label: "icon", value: "{{{icon}}}" },
  { label: "space", value: "&nbsp;" },
];

const positionOptions: Option[] = [
  { value: "append", label: "End" },
  { value: "prepend", label: "Start" },
];

const ButtonConfiguration: React.FC<{
  isLocked: boolean;
}> = ({ isLocked = false }) => {
  const [{ value: onSuccess }] = useField("modComponent.onSuccess");

  return (
    <>
      <ConnectedFieldTemplate
        name="modComponent.caption"
        label="Button text"
        description="This is the text that appears on the button"
      />

      <ConnectedFieldTemplate
        name="starterBrick.definition.containerSelector"
        as={LocationWidget}
        {...makeLockableFieldProps("Location", isLocked)}
      />

      <UrlMatchPatternField
        name="starterBrick.definition.isAvailable.matchPatterns"
        {...makeLockableFieldProps("Sites", isLocked)}
      />

      <ConnectedFieldTemplate
        name="starterBrick.definition.isAvailable.allFrames"
        title="Show in All Frames"
        as={BooleanWidget}
        description="Show button in all matching frames. If toggled off, the button will only be added in the top-level frame."
        {...makeLockableFieldProps("Show in All Frames", isLocked)}
      />

      <ConnectedCollapsibleFieldSection title="Advanced: Item Options">
        <ConnectedFieldTemplate
          name="modComponent.icon"
          label="Icon"
          as={IconWidget}
          description="Icon to place in the icon placeholder of the template"
        />

        <ConnectedFieldTemplate
          name="starterBrick.definition.position"
          description="Position relative to other buttons"
          as={SelectWidget}
          blankValue={null}
          options={positionOptions}
          {...makeLockableFieldProps("Order/Position", isLocked)}
        />

        <ConnectedFieldTemplate
          name="starterBrick.definition.template"
          as={TemplateWidget}
          description="A template for the item, with a placeholder for the caption and/or icon"
          snippets={buttonSnippets}
          {...makeLockableFieldProps("Template", isLocked)}
        />

        <ConnectedFieldTemplate
          name="starterBrick.definition.attachMode"
          as="select"
          title="Attach Mode"
          description={
            <p>
              Use&nbsp;<code>once</code> to add the buttons once the button
              container becomes available. Use&nbsp;
              <code>watch</code> to continue to watch the page for new
              containers.
            </p>
          }
          {...makeLockableFieldProps("Attach Mode", isLocked)}
        >
          <option value="once">once</option>
          <option value="watch">watch</option>
        </ConnectedFieldTemplate>

        <ConnectedFieldTemplate
          name="starterBrick.definition.targetMode"
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
          name="modComponent.synchronous"
          label="Synchronous"
          as={SwitchButtonWidget}
          description="Prevent button to be clicked again while action is in progress"
          blankValue={false}
        />

        {(typeof onSuccess === "boolean" || onSuccess == null) && (
          // Punt on object-based configuration for now. Enterprise customers are just asking to turn off the message.
          // If they want a custom message they can add an alert brick.
          <ConnectedFieldTemplate
            name="modComponent.onSuccess"
            label="Show Success Message"
            as={SwitchButtonWidget}
            description="Show the default success message when run"
            blankValue={true}
          />
        )}
      </ConnectedCollapsibleFieldSection>
      <MatchRulesSection isLocked={isLocked} />

      <ExtraPermissionsSection />
    </>
  );
};

export default ButtonConfiguration;
