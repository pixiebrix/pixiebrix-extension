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

import React, { useCallback, useRef, useState } from "react";
import {
  Button,
  // eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
  Form,
  type FormControlProps,
  InputGroup,
} from "react-bootstrap";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { useField } from "formik";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useAutoFocusConfiguration from "@/hooks/useAutoFocusConfiguration";

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

  const defaultInputRef = useRef<HTMLElement>();
  const inputRef = inputRefProp ?? defaultInputRef;
  useAutoFocusConfiguration({ elementRef: inputRef, focus: focusInput });

  const onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    ({ target }) => {
      setValue(target.value);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- don't include formik helpers
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
