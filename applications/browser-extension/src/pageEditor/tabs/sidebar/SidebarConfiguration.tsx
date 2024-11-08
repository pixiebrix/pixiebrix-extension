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
import ConnectedFieldTemplate from "../../../components/form/ConnectedFieldTemplate";
import UrlMatchPatternField from "../../fields/UrlMatchPatternField";
import { makeLockableFieldProps } from "../../fields/makeLockableFieldProps";
import MatchRulesSection from "../MatchRulesSection";
import { partial } from "lodash";
import DebounceFieldSet from "../trigger/DebounceFieldSet";
import {
  SidebarTriggers,
  type Trigger,
} from "../../../starterBricks/sidebar/sidebarStarterBrickTypes";
import { useField, useFormikContext } from "formik";
import { type TriggerFormState } from "../../starterBricks/formStateTypes";
import { type DebounceOptions } from "../../../starterBricks/types";
import ExtraPermissionsSection from "../ExtraPermissionsSection";
import { joinName } from "../../../utils/formUtils";

const SidebarConfiguration: React.FC<{
  isLocked: boolean;
}> = ({ isLocked = false }) => {
  const fieldName = partial(joinName, "starterBrick.definition");

  const [{ value: trigger }] = useField<Trigger>(fieldName("trigger"));

  const [{ value: debounce }] = useField<DebounceOptions | null>(
    fieldName("debounce"),
  );

  const { setFieldValue } = useFormikContext<TriggerFormState>();

  const onTriggerChange = ({
    currentTarget,
  }: React.FormEvent<HTMLSelectElement>) => {
    const nextTrigger = currentTarget.value as Trigger;

    if (nextTrigger === SidebarTriggers.CUSTOM) {
      void setFieldValue(fieldName("customEvent"), { eventName: "" });
    } else {
      void setFieldValue(fieldName("customEvent"), null);
    }

    if (nextTrigger !== SidebarTriggers.MANUAL && debounce == null) {
      // Add debounce by default, because the selection event fires for every event when clicking and dragging
      void setFieldValue(fieldName("debounce"), {
        waitMillis: 250,
        leading: false,
        trailing: true,
      });
    } else if (nextTrigger === SidebarTriggers.MANUAL) {
      void setFieldValue(fieldName("debounce"), null);
    }

    void setFieldValue(fieldName("trigger"), currentTarget.value);
  };

  return (
    <>
      <ConnectedFieldTemplate
        name="modComponent.heading"
        // If you change this label, update the field title in ShowSidebar
        label="Tab Title"
        description="The text that will appear in the tab along the top of the Sidebar Panel"
      />

      <UrlMatchPatternField
        name="starterBrick.definition.isAvailable.matchPatterns"
        {...makeLockableFieldProps("Sites", isLocked)}
      />

      <ConnectedFieldTemplate
        name={fieldName("trigger")}
        as="select"
        description="Event to refresh the panel"
        onChange={onTriggerChange}
        {...makeLockableFieldProps("Trigger", isLocked)}
      >
        <option value={SidebarTriggers.LOAD}>Page Load / Navigation</option>
        <option value={SidebarTriggers.SELECTION_CHANGE}>
          Selection Change
        </option>
        <option value={SidebarTriggers.STATE_CHANGE}>State Change</option>
        <option value={SidebarTriggers.CUSTOM}>Custom Event</option>
        <option value={SidebarTriggers.MANUAL}>Manual</option>
      </ConnectedFieldTemplate>

      {trigger === "custom" && (
        <ConnectedFieldTemplate
          title="Custom Event"
          name={fieldName("customEvent", "eventName")}
          description="The custom event name"
          {...makeLockableFieldProps("Custom Event", isLocked)}
        />
      )}

      <DebounceFieldSet isLocked={isLocked} />

      <MatchRulesSection isLocked={isLocked} />

      <ExtraPermissionsSection />
    </>
  );
};

export default SidebarConfiguration;
