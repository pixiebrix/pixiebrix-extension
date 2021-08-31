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
import { useFormikContext } from "formik";
import { Form } from "react-bootstrap";
import HorizontalFormGroup from "@/components/fields/HorizontalFormGroup";
import { FormState } from "@/devTools/editor/editorSlice";
import { getCurrentURL } from "@/devTools/utils";
import {
  createDomainPattern,
  createSitePattern,
  HTTPS_PATTERN,
  SITES_PATTERN,
} from "@/permissions/patterns";

const MatchPatternShortcut: React.FC<{
  caption: string;
  patternFactory: () => Promise<string>;
}> = ({ caption, patternFactory }) => {
  const { setFieldValue } = useFormikContext<FormState>();

  const setMatchPattern = useCallback(
    (pattern) => {
      setFieldValue(
        "extensionPoint.definition.isAvailable.matchPatterns",
        pattern
      );
    },
    [setFieldValue]
  );

  return (
    <a
      href="#"
      className="mx-2"
      role="button"
      onClick={async () => {
        const pattern = await patternFactory();
        setMatchPattern(pattern);
      }}
    >
      {caption}
    </a>
  );
};

const PanelForm: React.FC = () => (
  <div>
    <HorizontalFormGroup
      label="Heading"
      description="Panel heading to show in the sidebar"
      propsOrFieldName="extension.heading"
    >
      {(field, meta) => (
        <Form.Control type="text" {...field} isInvalid={Boolean(meta.error)} />
      )}
    </HorizontalFormGroup>

    <HorizontalFormGroup
      label="Sites"
      description="Sites the panel should be available on"
      propsOrFieldName="extensionPoint.definition.isAvailable.matchPatterns"
    >
      {(field, meta) => (
        <>
          <div className="small">
            <span>Shortcuts:</span>
            <MatchPatternShortcut
              caption="Site"
              patternFactory={async () => {
                const url = await getCurrentURL();
                return createSitePattern(url);
              }}
            />{" "}
            <MatchPatternShortcut
              caption="Domain"
              patternFactory={async () => {
                const url = await getCurrentURL();
                return createDomainPattern(url);
              }}
            />
            <MatchPatternShortcut
              caption="HTTPS"
              patternFactory={async () => HTTPS_PATTERN}
            />
            <MatchPatternShortcut
              caption="All URLs"
              patternFactory={async () => SITES_PATTERN}
            />
          </div>
          <Form.Control
            type="text"
            {...field}
            isInvalid={Boolean(meta.error)}
          />
        </>
      )}
    </HorizontalFormGroup>
  </div>
);

export default PanelForm;
