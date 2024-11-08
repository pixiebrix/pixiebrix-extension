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
import LocationWidget from "../../fields/LocationWidget";
import { useField, useFormikContext } from "formik";
import { type TriggerFormState } from "../../starterBricks/formStateTypes";
import { getDefaultReportModeForTrigger } from "../../../starterBricks/trigger/triggerStarterBrick";
import { makeLockableFieldProps } from "../../fields/makeLockableFieldProps";
import BooleanWidget from "../../../components/fields/schemaFields/widgets/BooleanWidget";
import { partial } from "lodash";
import MatchRulesSection from "../MatchRulesSection";
import DebounceFieldSet from "./DebounceFieldSet";
import { type DebounceOptions } from "../../../starterBricks/types";
import ExtraPermissionsSection from "../ExtraPermissionsSection";
import {
  ReportModes,
  type Trigger,
  Triggers,
} from "../../../starterBricks/trigger/triggerStarterBrickTypes";
import { useSelector } from "react-redux";
import { selectKnownEventNamesForActiveModComponent } from "../../store/editor/editorSelectors";
import SchemaSelectWidget from "../../../components/fields/schemaFields/widgets/SchemaSelectWidget";
import { joinName } from "../../../utils/formUtils";

function supportsSelector(trigger: Trigger) {
  return ![
    Triggers.LOAD,
    Triggers.INTERVAL,
    Triggers.SELECTION_CHANGE,
    Triggers.STATE_CHANGE,
  ].includes(trigger);
}

function supportsTargetMode(trigger: Trigger) {
  // XXX: why doesn't `appear` support target mode?
  return supportsSelector(trigger) && trigger !== Triggers.APPEAR;
}

const TriggerConfiguration: React.FC<{
  isLocked: boolean;
}> = ({ isLocked = false }) => {
  const fieldName = partial(joinName, "starterBrick.definition");

  const [{ value: trigger }] = useField<Trigger>(fieldName("trigger"));

  const [{ value: debounce }] = useField<DebounceOptions | null>(
    fieldName("debounce"),
  );

  const { setFieldValue } = useFormikContext<TriggerFormState>();

  const knownEventNames = useSelector(
    selectKnownEventNamesForActiveModComponent,
  );

  const onTriggerChange = ({
    currentTarget,
  }: React.FormEvent<HTMLSelectElement>) => {
    const nextTrigger = currentTarget.value as Trigger;

    if (!supportsSelector(nextTrigger)) {
      void setFieldValue(fieldName("rootSelector"), null);
      void setFieldValue(fieldName("attachMode"), null);
    }

    if (!supportsTargetMode(nextTrigger)) {
      void setFieldValue(fieldName("targetMode"), null);
    }

    if (nextTrigger !== Triggers.INTERVAL) {
      void setFieldValue(fieldName("intervalMillis"), null);
      void setFieldValue(fieldName("background"), null);
    }

    if (nextTrigger === Triggers.CUSTOM) {
      void setFieldValue(fieldName("customEvent"), { eventName: "" });
    } else {
      void setFieldValue(fieldName("customEvent"), null);
    }

    void setFieldValue(
      fieldName("reportMode"),
      getDefaultReportModeForTrigger(nextTrigger),
    );

    if (nextTrigger === Triggers.SELECTION_CHANGE && debounce == null) {
      // Add debounce by default, because the selection event fires for every event when clicking and dragging
      void setFieldValue(fieldName("debounce"), {
        waitMillis: 250,
        leading: false,
        trailing: true,
      });
    }

    void setFieldValue(fieldName("trigger"), currentTarget.value);
  };

  return (
    <>
      <ConnectedFieldTemplate
        name={fieldName("trigger")}
        as="select"
        description="Select a browser event to trigger or launch this mod"
        onChange={onTriggerChange}
        {...makeLockableFieldProps("Trigger Event", isLocked)}
      >
        <option value={Triggers.LOAD}>Page Load / Navigation</option>
        <option value={Triggers.INTERVAL}>Interval</option>
        <option value={Triggers.INITIALIZE}>Initialize</option>
        <option value={Triggers.APPEAR}>Appear</option>
        <option value={Triggers.CLICK}>Click</option>
        <option value={Triggers.DOUBLE_CLICK}>Double Click</option>
        <option value={Triggers.BLUR}>Blur</option>
        <option value={Triggers.MOUSEOVER}>Mouseover</option>
        <option value={Triggers.HOVER}>Hover</option>
        <option value={Triggers.SELECTION_CHANGE}>Selection Change</option>
        <option value={Triggers.KEYDOWN}>Keydown</option>
        <option value={Triggers.KEYUP}>Keyup</option>
        <option value={Triggers.KEYPRESS}>Keypress</option>
        <option value={Triggers.CHANGE}>Change</option>
        <option value={Triggers.STATE_CHANGE}>State Change</option>
        <option value={Triggers.CUSTOM}>Custom Event</option>
      </ConnectedFieldTemplate>

      {trigger === Triggers.CUSTOM && (
        <ConnectedFieldTemplate
          title="Custom Event"
          description="The custom event name. Select an event from this Mod, or type a new event name"
          name={fieldName("customEvent", "eventName")}
          {...makeLockableFieldProps("Custom Event", isLocked)}
          as={SchemaSelectWidget}
          schema={{
            type: "string",
            examples: knownEventNames,
          }}
        />
      )}

      {trigger === Triggers.INTERVAL && (
        <ConnectedFieldTemplate
          name={fieldName("intervalMillis")}
          title="Interval (ms)"
          type="number"
          description="Interval to run the trigger in milliseconds"
          {...makeLockableFieldProps("Interval", isLocked)}
        />
      )}

      <ConnectedFieldTemplate
        name={fieldName("background")}
        title="Run in Background"
        as={BooleanWidget}
        description="Run the trigger in inactive tabs."
        {...makeLockableFieldProps("Run in Background", isLocked)}
      />

      <ConnectedFieldTemplate
        name={fieldName("isAvailable", "allFrames")}
        title="Run in All Frames"
        as={BooleanWidget}
        description="Run the trigger in all frames. If toggled off, the trigger will only run in the top-level frame."
        {...makeLockableFieldProps("Run in All Frames", isLocked)}
      />

      {supportsSelector(trigger) && (
        <>
          <ConnectedFieldTemplate
            name={fieldName("rootSelector")}
            as={LocationWidget}
            selectMode="element"
            description="Use your cursor to select an element on the page to watch"
            {...makeLockableFieldProps("Element Selector", isLocked)}
          />

          <ConnectedFieldTemplate
            name={fieldName("attachMode")}
            as="select"
            title="Attach Mode"
            description={
              <p>
                Use&nbsp;<code>once</code> to attach the trigger once one or
                more elements are available. Use&nbsp;
                <code>watch</code> to also add the trigger as new matching
                elements are added to the page.
              </p>
            }
            {...makeLockableFieldProps("Attach Mode", isLocked)}
          >
            <option value="once">Once</option>
            <option value="watch">Watch</option>
          </ConnectedFieldTemplate>
        </>
      )}

      {supportsTargetMode(trigger) && (
        <ConnectedFieldTemplate
          name={fieldName("targetMode")}
          as="select"
          title="Target Mode"
          description={
            <p>
              Use <code>eventTarget</code> to use the event target as the root
              element for brick execution. Use&nbsp;
              <code>root</code> to use the closest ancestor element matching the
              trigger&apos;s selector.
            </p>
          }
          {...makeLockableFieldProps("Target Mode", isLocked)}
        >
          <option value="eventTarget">eventTarget</option>
          <option value="root">root</option>
        </ConnectedFieldTemplate>
      )}

      <DebounceFieldSet isLocked={isLocked} />

      <UrlMatchPatternField
        name={fieldName("isAvailable", "matchPatterns")}
        {...makeLockableFieldProps("Sites", isLocked)}
      />

      <ConnectedFieldTemplate
        name={fieldName("showErrors")}
        as={BooleanWidget}
        title="Show Error Notifications"
        description={
          <p>Show an error to the mod user if the trigger fails to execute.</p>
        }
        {...makeLockableFieldProps("Show Error Notifications", isLocked)}
      />

      <ConnectedFieldTemplate
        name={fieldName("reportMode")}
        as="select"
        title="Telemetry Mode"
        description={
          <p>
            Configures which events (also known as runs) and errors to report in
            mod telemetry.
          </p>
        }
        {...makeLockableFieldProps("Telemetry Mode", isLocked)}
      >
        <option value={ReportModes.ALL}>Report All Events and Errors</option>
        <option value={ReportModes.ONCE}>Report First Event and Error</option>
        <option value={ReportModes.ERROR_ONCE}>Report First Error</option>
        <option value={ReportModes.NEVER}>Never Report Events or Errors</option>
      </ConnectedFieldTemplate>

      <MatchRulesSection isLocked={isLocked} />

      <ExtraPermissionsSection />
    </>
  );
};

export default TriggerConfiguration;
