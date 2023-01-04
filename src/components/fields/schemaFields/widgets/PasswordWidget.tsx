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
import styles from "./PasswordWidget.module.scss";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Form,
  type FormControlProps,
  InputGroup,
} from "react-bootstrap";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { useField } from "formik";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const PasswordWidget: React.VFC<SchemaFieldProps & FormControlProps> = ({
  name,
  schema,
  isRequired,
  uiSchema,
  hideLabel,
  isObjectProperty,
  isArrayItem,
  focusInput,
  inputRef: inputRefProp,
  ...restProps
}) => {
  const [{ value }, , { setValue }] = useField<string>(name);
  const [show, setShow] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>();

  useEffect(() => {
    if (focusInput) {
      inputRef.current?.focus();
    }
  }, [focusInput]);

  useEffect(() => {
    // Sync the ref values
    if (inputRefProp) {
      inputRefProp.current = inputRef.current;
    }
  }, [inputRef.current]);

  const onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    ({ target }) => {
      setValue(target.value);
    },
    []
  );

  return (
    <InputGroup>
      <Form.Control
        {...restProps}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        ref={inputRef}
      />
      <InputGroup.Append>
        <Button
          variant="default"
          onClick={() => {
            setShow(!show);
          }}
          className={styles.showHideButton}
        >
          <FontAwesomeIcon fixedWidth icon={show ? faEye : faEyeSlash} />
        </Button>
      </InputGroup.Append>
    </InputGroup>
  );
};

export default PasswordWidget;
