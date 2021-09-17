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

import React from "react";
import { getCurrentURL } from "@/devTools/utils";
import {
  createDomainPattern,
  createSitePattern,
  HTTPS_PATTERN,
  SITES_PATTERN,
} from "@/permissions/patterns";
import { CustomFieldWidget } from "@/components/form/FieldTemplate";
import { Alert, Button, Form } from "react-bootstrap";
import styles from "./UrlMatchPatternWidget.module.scss";
import { useField } from "formik";

const UrlMatchShortcut: React.FC<{
  caption: string;
  onClick: () => void;
}> = ({ caption, onClick }) => (
  <Button variant="link" size="sm" className={styles.root} onClick={onClick}>
    {caption}
  </Button>
);

const UrlMatchPatternWidget: CustomFieldWidget = (props) => {
  const { name, disabled } = props;

  const { setValue } = useField(name)[2];

  return (
    <>
      {disabled ? (
        <Alert variant="info">
          You do not have permission to edit this foundation
        </Alert>
      ) : (
        <div className="small">
          <span>Shortcuts:</span>
          <UrlMatchShortcut
            caption="Site"
            onClick={async () => {
              const url = await getCurrentURL();
              const pattern = createSitePattern(url);
              setValue(pattern);
            }}
          />{" "}
          <UrlMatchShortcut
            caption="Domain"
            onClick={async () => {
              const url = await getCurrentURL();
              const pattern = createDomainPattern(url);
              setValue(pattern);
            }}
          />
          <UrlMatchShortcut
            caption="HTTPS"
            onClick={async () => {
              setValue(HTTPS_PATTERN);
            }}
          />
          <UrlMatchShortcut
            caption="All URLs"
            onClick={async () => {
              setValue(SITES_PATTERN);
            }}
          />
        </div>
      )}
      <Form.Control type="text" {...props} />
    </>
  );
};

export default UrlMatchPatternWidget;
