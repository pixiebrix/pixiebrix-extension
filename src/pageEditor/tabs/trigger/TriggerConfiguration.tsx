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

import React, { ChangeEvent } from "react";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { Card } from "react-bootstrap";
import UrlMatchPatternField from "@/pageEditor/fields/UrlMatchPatternField";
import FieldSection from "@/pageEditor/fields/FieldSection";
import LocationWidget from "@/pageEditor/fields/LocationWidget";
import { useField, useFormikContext } from "formik";
import { TriggerFormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { DebounceOptions, Trigger } from "@/extensionPoints/triggerExtension";
import { makeLockableFieldProps } from "@/pageEditor/fields/makeLockableFieldProps";
import BooleanWidget from "@/components/fields/schemaFields/widgets/BooleanWidget";
import NumberWidget from "@/components/fields/schemaFields/widgets/NumberWidget";
import FieldTemplate from "@/components/form/FieldTemplate";
import { isEmpty, partial } from "lodash";
import { joinName } from "@/utils";
import SwitchButtonWidget, {
  CheckBoxLike,
} from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import UrlPatternField from "@/pageEditor/fields/UrlPatternField";

function supportsSelector(trigger: Trigger) {
  return !["load", "interval"].includes(trigger);
}

function supportsTargetMode(trigger: Trigger) {
  // XXX: why doesn't `appear` support target mode?
  return supportsSelector(trigger) && trigger !== "appear";
}

const TriggerConfiguration: React.FC<{
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

    if (!supportsSelector(nextTrigger)) {
      setFieldValue(fieldName("rootSelector"), null);
      setFieldValue(fieldName("attachMode"), null);
    }

    if (!supportsTargetMode(nextTrigger)) {
      setFieldValue(fieldName("targetMode"), null);
    }

    if (nextTrigger !== "interval") {
      setFieldValue(fieldName("intervalMillis"), null);
      setFieldValue(fieldName("background"), null);
    }

    setFieldValue(fieldName("trigger"), currentTarget.value);
  };

  return (
    <Card>
      <FieldSection title="Configuration">
        <ConnectedFieldTemplate
          name={fieldName("trigger")}
          as="select"
          description="Trigger event"
          onChange={onTriggerChange}
          {...makeLockableFieldProps("Trigger", isLocked)}
        >
          <option value="load">Page Load</option>
          <option value="interval">Interval</option>
          <option value="initialize">Initialize</option>
          <option value="appear">Appear</option>
          <option value="click">Click</option>
          <option value="dblclick">Double Click</option>
          <option value="blur">Blur</option>
          <option value="mouseover">Mouseover</option>
          <option value="keydown">Keydown</option>
          <option value="keyup">Keyup</option>
          <option value="keypress">Keypress</option>
          <option value="change">Change</option>
        </ConnectedFieldTemplate>

        {trigger === "interval" && (
          <>
            <ConnectedFieldTemplate
              name={fieldName("intervalMillis")}
              title="Interval (ms)"
              type="number"
              description="Interval to run the trigger in milliseconds"
              {...makeLockableFieldProps("Interval", isLocked)}
            />
            <ConnectedFieldTemplate
              name={fieldName("background")}
              title="Run in Background"
              as={BooleanWidget}
              description="Run the interval in inactive tabs"
              {...makeLockableFieldProps("Run in Background", isLocked)}
            />
          </>
        )}

        {supportsSelector(trigger) && (
          <>
            <ConnectedFieldTemplate
              name={fieldName("rootSelector")}
              as={LocationWidget}
              selectMode="element"
              description="An element to watch"
              {...makeLockableFieldProps("Element", isLocked)}
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
              <option value="once">once</option>
              <option value="watch">watch</option>
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
                <code>root</code> to use the closest ancestor element matching
                the trigger&apos;s selector.
              </p>
            }
            {...makeLockableFieldProps("Target Mode", isLocked)}
          >
            <option value="eventTarget">eventTarget</option>
            <option value="root">root</option>
          </ConnectedFieldTemplate>
        )}

        <FieldTemplate
          as={SwitchButtonWidget}
          description="Debounce the trigger"
          name="debounce"
          value={!isEmpty(debounce)}
          onChange={({ target }: ChangeEvent<CheckBoxLike>) => {
            if (target.value) {
              setFieldValue(fieldName("debounce"), {
                waitMillis: 250,
                leading: false,
                trailing: true,
              });
            } else {
              setFieldValue(fieldName("debounce"), null);
            }
          }}
          {...makeLockableFieldProps("Debounce", isLocked)}
        />

        {debounce && (
          <>
            <ConnectedFieldTemplate
              name={fieldName("debounce", "waitMillis")}
              as={NumberWidget}
              description="The number of milliseconds to delay"
              {...makeLockableFieldProps("Delay Millis", isLocked)}
            />
            <ConnectedFieldTemplate
              name={fieldName("debounce", "leading")}
              as={BooleanWidget}
              description="Specify invoking on the leading edge of the debounced timeout."
              {...makeLockableFieldProps("Leading", isLocked)}
            />
            <ConnectedFieldTemplate
              name={fieldName("debounce", "trailing")}
              as={BooleanWidget}
              description="Specify invoking on the trailing edge of the debounced timeout."
              {...makeLockableFieldProps("Trailing", isLocked)}
            />
          </>
        )}

        <UrlMatchPatternField
          name={fieldName("isAvailable", "matchPatterns")}
          {...makeLockableFieldProps("Sites", isLocked)}
        />

        <UrlPatternField
          name={fieldName("isAvailable", "urlPatterns")}
          {...makeLockableFieldProps("URL Patterns", isLocked)}
        />
      </FieldSection>
    </Card>
  );
};

export default TriggerConfiguration;
