/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useMemo } from "react";
import { Alert, Col, Form, Row, Tab } from "react-bootstrap";
import { FastField, FieldInputProps, useFormikContext } from "formik";
import SelectorSelectorField from "@/devTools/editor/SelectorSelectorField";
import { FormState } from "@/devTools/editor/editorSlice";

const AvailabilityTab: React.FunctionComponent<{
  eventKey?: string;
  editable: Set<string>;
}> = ({ eventKey = "availability", editable }) => {
  const { values } = useFormikContext<FormState>();
  const locked = useMemo(
    () => values.installed && !editable?.has(values.extensionPoint.metadata.id),
    [editable, values.installed, values.extensionPoint.metadata.id]
  );

  return (
    <Tab.Pane eventKey={eventKey} className="h-100">
      {locked && (
        <Alert variant="info">
          You do not have edit permissions for this foundation
        </Alert>
      )}
      <Form.Group as={Row} controlId="formMatchPatterns">
        <Form.Label column sm={2}>
          Match Patterns
        </Form.Label>
        <Col sm={10}>
          <FastField name="extensionPoint.definition.isAvailable.matchPatterns">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control type="text" {...field} disabled={locked} />
            )}
          </FastField>
          <Form.Text className="text-muted">
            URL match pattern for which pages to run the extension on
          </Form.Text>
        </Col>
      </Form.Group>
      <Form.Group as={Row} controlId="formAvailableSelectors" className="pb-4">
        <Form.Label column sm={2}>
          Selector
        </Form.Label>
        <Col sm={10}>
          <SelectorSelectorField
            name="extensionPoint.definition.isAvailable.selectors"
            isClearable
            disabled={locked}
          />
          <Form.Text className="text-muted">
            (Optional) Element that must be found on page for extension point to
            be available
          </Form.Text>
        </Col>
      </Form.Group>
    </Tab.Pane>
  );
};

export default AvailabilityTab;
