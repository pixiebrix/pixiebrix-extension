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

import React, { useCallback, useContext, useMemo } from "react";
import { Alert, Col, Form, Row, Tab } from "react-bootstrap";
import { FastField, FieldInputProps, useFormikContext } from "formik";
import SelectorSelectorField from "@/devTools/editor/fields/SelectorSelectorField";
import { FormState } from "@/devTools/editor/editorSlice";
import { openTab } from "@/background/executor";
import { getTabInfo } from "@/background/devtools";
import { getDomain } from "@/devTools/editor/extensionPoints/base";
import { DevToolsContext } from "@/devTools/context";

const AvailabilityTab: React.FunctionComponent<{
  eventKey?: string;
  editable: Set<string>;
}> = ({ eventKey = "availability", editable }) => {
  const { port } = useContext(DevToolsContext);
  const { values, getFieldHelpers } = useFormikContext<FormState>();
  const locked = useMemo(
    () => values.installed && !editable?.has(values.extensionPoint.metadata.id),
    [editable, values.installed, values.extensionPoint.metadata.id]
  );

  const setMatchPattern = useCallback(
    (pattern) => {
      const helpers = getFieldHelpers(
        "extensionPoint.definition.isAvailable.matchPatterns"
      );
      helpers.setValue(pattern);
    },
    [getFieldHelpers]
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
          {!locked && (
            <div className="small">
              <span>Shortcuts:</span>
              <a
                href="#"
                className="mx-2"
                role="button"
                onClick={async () => {
                  const url = (await getTabInfo(port)).url;
                  const parsed = new URL(url);
                  setMatchPattern(`${parsed.protocol}//${parsed.hostname}/*`);
                }}
              >
                Site
              </a>{" "}
              <a
                href="#"
                className="mx-2"
                role="button"
                onClick={async () => {
                  const url = (await getTabInfo(port)).url;
                  const parsed = new URL(url);
                  setMatchPattern(`${parsed.protocol}//*.${getDomain(url)}/*`);
                }}
              >
                Domain
              </a>{" "}
              <a
                href="#"
                role="button"
                className="mx-2"
                onClick={() => setMatchPattern("https://*/*")}
              >
                HTTPS
              </a>{" "}
              <a
                href="#"
                role="button"
                className="mx-2"
                onClick={() => setMatchPattern("*://*/*")}
              >
                All URLs
              </a>
            </div>
          )}
          <FastField name="extensionPoint.definition.isAvailable.matchPatterns">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control type="text" {...field} disabled={locked} />
            )}
          </FastField>
          <Form.Text className="text-muted">
            URL match pattern for which pages to run the extension on. See{" "}
            <a
              href="#"
              onClick={() =>
                openTab({
                  url:
                    "https://developer.chrome.com/docs/extensions/mv2/match_patterns/",
                  active: true,
                })
              }
            >
              Chrome Documentation
            </a>{" "}
            for examples
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
