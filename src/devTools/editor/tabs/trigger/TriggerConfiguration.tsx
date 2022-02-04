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

import React, { useCallback } from "react";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { Card } from "react-bootstrap";
import UrlMatchPatternField from "@/devTools/editor/fields/UrlMatchPatternField";
import FieldSection from "@/devTools/editor/fields/FieldSection";
import LocationWidget from "@/devTools/editor/fields/LocationWidget";
import { useField, useFormikContext } from "formik";
import { TriggerFormState } from "@/devTools/editor/extensionPoints/trigger";
import { Trigger } from "@/extensionPoints/triggerExtension";
import { makeLockableFieldProps } from "@/devTools/editor/fields/makeLockableFieldProps";
import BooleanWidget from "@/components/fields/schemaFields/widgets/BooleanWidget";

function supportsSelector(trigger: Trigger) {
  return !["load", "interval"].includes(trigger);
}

function supportsTargetMode(trigger: Trigger) {
  return supportsSelector(trigger) && trigger !== "appear";
}

const TriggerConfiguration: React.FC<{
  isLocked: boolean;
}> = ({ isLocked = false }) => {
  const [{ value: trigger }] = useField<Trigger>(
    "extensionPoint.definition.trigger"
  );
  const { setFieldValue } = useFormikContext<TriggerFormState>();

  const onTriggerChange = useCallback(
    ({ currentTarget }: React.FormEvent<HTMLSelectElement>) => {
      const nextTrigger = currentTarget.value as Trigger;

      if (!supportsSelector(nextTrigger)) {
        setFieldValue("extensionPoint.definition.rootSelector", null);
        setFieldValue("extensionPoint.definition.attachMode", null);
        setFieldValue("extensionPoint.definition.targetMode", null);
      }

      if (nextTrigger !== "interval") {
        setFieldValue("extensionPoint.definition.intervalMillis", null);
        setFieldValue("extensionPoint.definition.background", null);
      }

      setFieldValue("extensionPoint.definition.trigger", currentTarget.value);
    },
    [setFieldValue]
  );

  return (
    <Card>
      <FieldSection title="Configuration">
        <ConnectedFieldTemplate
          name="extensionPoint.definition.trigger"
          as="select"
          description="Trigger event"
          onChange={onTriggerChange}
          {...makeLockableFieldProps("Trigger", isLocked)}
        >
          <option value="load">Page Load</option>
          <option value="interval">Interval</option>
          <option value="appear">Appear</option>
          <option value="click">Click</option>
          <option value="dblclick">Double Click</option>
          <option value="blur">Blur</option>
          <option value="mouseover">Mouseover</option>
        </ConnectedFieldTemplate>

        {trigger === "interval" && (
          <>
            <ConnectedFieldTemplate
              name="extensionPoint.definition.intervalMillis"
              title="Interval (ms)"
              type="number"
              description="Interval to run the trigger in milliseconds"
              {...makeLockableFieldProps("Interval", isLocked)}
            />
            <ConnectedFieldTemplate
              name="extensionPoint.definition.background"
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
              name="extensionPoint.definition.rootSelector"
              as={LocationWidget}
              selectMode="element"
              description="An element to watch"
              {...makeLockableFieldProps("Element", isLocked)}
            />

            <ConnectedFieldTemplate
              name="extensionPoint.definition.attachMode"
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
            name="extensionPoint.definition.targetMode"
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

        <UrlMatchPatternField
          name="extensionPoint.definition.isAvailable.matchPatterns[0]"
          {...makeLockableFieldProps("Sites", isLocked)}
        />
      </FieldSection>
    </Card>
  );
};

export default TriggerConfiguration;
