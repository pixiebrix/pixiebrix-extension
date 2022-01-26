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

import { faPlus, faMinus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FieldArray, Field } from "formik";
import React from "react";
import { Button, ButtonGroup, FormControl } from "react-bootstrap";
import styles from "./OptionsWidget.module.scss";

type OptionsWidgetProps = {
  name: string;
  value: string[];
};

const OptionsWidget: React.FC<OptionsWidgetProps> = ({ name, value }) => (
  <FieldArray
    name={name}
    render={(arrayHelpers) =>
      value.length > 0 ? (
        value.map((_: string, index: number) => (
          <div key={index} className={styles.controlsContainer}>
            <Field
              name={`${name}.${index}`}
              as={FormControl}
              className={styles.field}
            />
            <ButtonGroup
              aria-label="Configure options"
              className={styles.buttonGroup}
            >
              <Button
                onClick={() => {
                  arrayHelpers.insert(index + 1, "");
                }}
                variant="primary"
                size="sm"
              >
                <FontAwesomeIcon icon={faPlus} />
              </Button>
              <Button
                onClick={() => {
                  arrayHelpers.remove(index);
                }}
                variant="danger"
                size="sm"
              >
                <FontAwesomeIcon icon={faMinus} />
              </Button>
            </ButtonGroup>
          </div>
        ))
      ) : (
        <div className={styles.emptyListContainer}>
          <Button
            onClick={() => {
              arrayHelpers.push("");
            }}
            variant="primary"
            size="sm"
          >
            Add option
          </Button>
        </div>
      )
    }
  />
);

export default OptionsWidget;
