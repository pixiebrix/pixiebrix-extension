/*
 * Copyright (C) 2021 Pixie Brix, LLC
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
import {
  FastField,
  Field,
  FieldInputProps,
  useField,
  useFormikContext,
} from "formik";
import { ContextMenuFormState } from "@/devTools/editor/editorSlice";
import { getTabInfo } from "@/background/devtools";
import { DevToolsContext } from "@/devTools/context";
import { getDomain } from "@/devTools/editor/extensionPoints/base";
import { openTab } from "@/background/executor";
import Select from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";

const CONTEXTS = [
  "page",
  "all",
  "frame",
  "selection",
  "link",
  "editable",
  "image",
  "video",
  "audio",
];

const contextOptions = CONTEXTS.map((value) => ({ value, label: value }));

interface ContextOption {
  value: string;
  label: string;
}

const ContextSelector: React.FunctionComponent<{
  name: string;
  disabled: boolean;
}> = ({ name, disabled }) => {
  const [field, , helpers] = useField<string[]>(name);
  return (
    <Select
      isMulti
      isDisabled={disabled}
      isClearable={false}
      options={contextOptions}
      value={contextOptions.filter((x) => field.value.includes(x.value))}
      onChange={(values) =>
        helpers.setValue((values as any).map((x: ContextOption) => x.value))
      }
    />
  );
};

const AvailabilityTab: React.FunctionComponent<{
  eventKey?: string;
  editable: Set<string>;
}> = ({ eventKey = "availability", editable }) => {
  const { values, getFieldHelpers } = useFormikContext<ContextMenuFormState>();
  const { port } = useContext(DevToolsContext);
  const locked = useMemo(
    () => values.installed && !editable?.has(values.extensionPoint.metadata.id),
    [editable, values.installed, values.extensionPoint.metadata.id]
  );

  const setDocumentPattern = useCallback(
    (pattern) => {
      const helpers = getFieldHelpers(
        "extensionPoint.definition.documentUrlPatterns[0]"
      );
      helpers.setValue(pattern);
    },
    [getFieldHelpers]
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
          <FontAwesomeIcon icon={faInfoCircle} /> You do not have edit
          permissions for this foundation
        </Alert>
      )}
      <Form.Group as={Row} controlId="formMatchPatterns">
        <Form.Label column sm={2}>
          Document URL Pattern
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
                  setDocumentPattern(
                    `${parsed.protocol}//${parsed.hostname}/*`
                  );
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
                  setDocumentPattern(
                    `${parsed.protocol}//*.${getDomain(url)}/*`
                  );
                }}
              >
                Domain
              </a>{" "}
              <a
                href="#"
                role="button"
                className="mx-2"
                onClick={() => setDocumentPattern("https://*/")}
              >
                HTTPS
              </a>{" "}
              <a
                href="#"
                role="button"
                className="mx-2"
                onClick={() => setDocumentPattern("*://*/")}
              >
                All URLs
              </a>
            </div>
          )}
          <FastField name="extensionPoint.definition.documentUrlPatterns[0]">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control type="text" {...field} disabled={locked} />
            )}
          </FastField>
          <Form.Text className="text-muted">
            Show context menu on documents whose URL matches the pattern. See{" "}
            <a
              href="#"
              onClick={async () =>
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

      <Form.Group as={Row} controlId="context">
        <Form.Label column sm={2}>
          Contexts
        </Form.Label>
        <Col sm={10}>
          <ContextSelector
            disabled={locked}
            name="extensionPoint.definition.contexts"
          />
          <Form.Text className="text-muted">
            One or more contexts to include the context menu item. For example,
            use the <code>selection</code> context to show the menu item when
            right-clicking selected text.
          </Form.Text>
        </Col>
      </Form.Group>

      <hr />

      <h4>Advanced Configuration</h4>

      <Form.Group as={Row} controlId="formExtensionPointId">
        <Form.Label column sm={2}>
          Foundation Id
        </Form.Label>
        <Col sm={10}>
          <Field name="extensionPoint.metadata.id">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control
                type="text"
                {...field}
                disabled={values.installed}
              />
            )}
          </Field>
        </Col>
      </Form.Group>
      <Form.Group as={Row} controlId="formFoundationName">
        <Form.Label column sm={2}>
          Foundation Name
        </Form.Label>
        <Col sm={10}>
          <Field name="extensionPoint.metadata.name">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control type="text" {...field} disabled={locked} />
            )}
          </Field>
        </Col>
      </Form.Group>

      <Form.Group as={Row} controlId="formMatchPatterns">
        <Form.Label column sm={2}>
          Automatic Permissions Match Pattern
        </Form.Label>
        <Col sm={10}>
          {!locked && (
            <div className="small">
              <span>Shortcuts:</span>
              <a
                href="#"
                role="button"
                className="mx-2"
                onClick={() =>
                  setMatchPattern(
                    values.extensionPoint.definition.documentUrlPatterns[0]
                  )
                }
              >
                Copy from above
              </a>
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
                onClick={() => setMatchPattern("https://*/")}
              >
                HTTPS
              </a>{" "}
              <a
                href="#"
                role="button"
                className="mx-2"
                onClick={() => setMatchPattern("*://*/")}
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
            URL match patterns give PixieBrix access to a page without you first
            clicking the context menu. Including URLs here helps PixieBrix run
            you action quicker, and accurately detect which page element you
            clicked to invoke the context menu.
          </Form.Text>
        </Col>
      </Form.Group>
    </Tab.Pane>
  );
};

export default AvailabilityTab;
