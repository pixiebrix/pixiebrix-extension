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
import UrlMatchPatternField from "@/pageEditor/fields/UrlMatchPatternField";
import FieldSection from "@/pageEditor/fields/FieldSection";
import { makeLockableFieldProps } from "@/pageEditor/fields/makeLockableFieldProps";
import MatchRulesSection from "@/pageEditor/tabs/MatchRulesSection";
import { partial } from "lodash";
import { joinName } from "@/utils";
import DebounceFieldSet from "@/pageEditor/tabs/trigger/DebounceFieldSet";
import { Trigger } from "@/extensionPoints/sidebarExtension";
import { useField, useFormikContext } from "formik";
import { TriggerFormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { DebounceOptions } from "@/extensionPoints/types";
import ExtraPermissionsSection from "@/pageEditor/tabs/ExtraPermissionsSection";

const SidebarConfiguration: React.FC<{
  isLocked: boolean;
}> = ({ isLocked = false }) => {
  const fieldName = partial(joinName, "extensionPoint.definition");

  const [{ value: trigger }] = useField<Trigger>(fieldName("trigger"));

  const [{ value: debounce }] = useField<DebounceOptions | null>(
    fieldName("debounce")
  );

  const { setFieldValue } = useFormikContext<TriggerFormState>();

  const onTriggerChange = ({
    currentTarget,
  }: React.FormEvent<HTMLSelectElement>) => {
    const nextTrigger = currentTarget.value as Trigger;

    if (nextTrigger === "custom") {
      setFieldValue(fieldName("customEvent"), { eventName: "" });
    } else {
      setFieldValue(fieldName("customEvent"), null);
    }

    if (nextTrigger !== "manual" && debounce == null) {
      // Add debounce by default, because the selection event fires for every event when clicking and dragging
      setFieldValue(fieldName("debounce"), {
        waitMillis: 250,
        leading: false,
        trailing: true,
      });
    } else if (nextTrigger === "manual") {
      setFieldValue(fieldName("debounce"), null);
    }

    setFieldValue(fieldName("trigger"), currentTarget.value);
  };

  return (
    <Card>
      <FieldSection title="Configuration">
        <ConnectedFieldTemplate
          name="extension.heading"
          label="Heading"
          description="Panel heading to show in the sidebar"
        />

        <UrlMatchPatternField
          name="extensionPoint.definition.isAvailable.matchPatterns"
          {...makeLockableFieldProps("Sites", isLocked)}
        />
      </FieldSection>

      <FieldSection title="Panel Refresh">
        <ConnectedFieldTemplate
          name={fieldName("trigger")}
          as="select"
          description="Event to refresh the panel"
          onChange={onTriggerChange}
          {...makeLockableFieldProps("Trigger", isLocked)}
        >
          <option value="load">Page Load / Navigation</option>
          <option value="selectionchange">Selection Change</option>
          <option value="statechange">State Change</option>
          <option value="custom">Custom Event</option>
          <option value="manual">Manual</option>
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
      </FieldSection>

      <MatchRulesSection isLocked={isLocked} />

      <ExtraPermissionsSection />
    </Card>
  );
};

export default SidebarConfiguration;
