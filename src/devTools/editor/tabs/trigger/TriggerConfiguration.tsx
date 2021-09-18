/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

const TriggerConfiguration: React.FC<{
  isLocked: boolean;
}> = ({ isLocked = false }) => {
  const [{ value: trigger }] = useField<Trigger>(
    "extensionPoint.definition.trigger"
  );
  const { setFieldValue } = useFormikContext<TriggerFormState>();

  const onTriggerChange = useCallback(
    (e: React.FormEvent<HTMLSelectElement>) => {
      if (e.currentTarget.value) {
        setFieldValue("extensionPoint.definition.rootSelector", null);
      }

      setFieldValue("extensionPoint.definition.trigger", e.currentTarget.value);
    },
    [setFieldValue]
  );

  return (
    <Card>
      <FieldSection title="Configuration">
        <ConnectedFieldTemplate
          name="extensionPoint.definition.trigger"
          label="Trigger"
          as="select"
          description="Trigger event"
          onChange={onTriggerChange}
        >
          <option value="load">Page Load</option>
          <option value="click">Click</option>
          <option value="dblclick">Double Click</option>
          <option value="blur">Blur</option>
          <option value="mouseover">Mouseover</option>
        </ConnectedFieldTemplate>

        {trigger !== "load" && (
          <ConnectedFieldTemplate
            name="extensionPoint.definition.rootSelector"
            label="Element"
            as={LocationWidget}
            selectionMode="element"
            description="An element to watch"
          />
        )}

        <UrlMatchPatternField
          name="extensionPoint.definition.isAvailable.matchPatterns"
          label="Sites"
          disabled={isLocked}
        />
      </FieldSection>
    </Card>
  );
};

export default TriggerConfiguration;
