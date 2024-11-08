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
import { Button, ButtonGroup } from "react-bootstrap";
import { type SchemaFieldProps } from "../propTypes";
import cx from "classnames";
import styles from "./HeadingStyleWidget.module.scss";
import { useField } from "formik";
import { VALID_HEADER_TAGS } from "../../../../pageEditor/documentBuilder/allowedElementTypes";

const HeadingStyleWidget: React.FunctionComponent<SchemaFieldProps> = (
  props,
) => {
  const [{ value }, , { setValue }] = useField<string>(props.name);

  return (
    <div className="mt-2">
      <ButtonGroup>
        {VALID_HEADER_TAGS.map((headingTag) => (
          <Button
            key={headingTag}
            className={cx(styles.button, {
              active: value === headingTag,
            })}
            variant="light"
            size="sm"
            onClick={async () => {
              await setValue(headingTag);
            }}
          >
            {headingTag.toUpperCase()}
          </Button>
        ))}
      </ButtonGroup>
    </div>
  );
};

export default HeadingStyleWidget;
