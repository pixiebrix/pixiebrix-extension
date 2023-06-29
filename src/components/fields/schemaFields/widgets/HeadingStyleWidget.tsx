/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import cx from "classnames";
import styles from "./HeadingStyleWidget.module.scss";
import { useField } from "formik";

// Bootstrap supports H1-H6: https://getbootstrap.com/docs/4.0/content/typography/
const headingTypes = {
  h1: {
    heading: "h1",
    title: "H1",
  },
  h2: {
    heading: "h2",
    title: "H2",
  },
  h3: {
    heading: "h3",
    title: "H3",
  },
  h4: {
    heading: "h4",
    title: "H4",
  },
  h5: {
    heading: "h5",
    title: "H5",
  },
  h6: {
    heading: "h6",
    title: "H6",
  },
};

const HeadingStyleWidget: React.FunctionComponent<SchemaFieldProps> = (
  props
) => {
  const [{ value }, , { setValue }] = useField<string>(props.name);

  return (
    <div className="mt-2">
      <ButtonGroup>
        {Object.values(headingTypes).map((headingType) => (
          <Button
            key={headingType.heading}
            className={cx(styles.button, {
              active: value === headingType.heading,
            })}
            variant="light"
            size="sm"
            onClick={() => {
              setValue(headingType.heading);
            }}
          >
            {headingType.title}
          </Button>
        ))}
      </ButtonGroup>
    </div>
  );
};

export default HeadingStyleWidget;
