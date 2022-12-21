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
import styles from "./PasswordWidget.module.scss";

import React, { forwardRef, useState } from "react";
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
import useAutoFocus from "@/hooks/useAutoFocus";
import useForwardedRef from "@/hooks/useForwardedRef";

const PasswordWidget: React.ForwardRefRenderFunction<
  HTMLInputElement,
  SchemaFieldProps & FormControlProps
> = (
  {
    name,
    schema,
    isRequired,
    uiSchema,
    hideLabel,
    isObjectProperty,
    isArrayItem,
    focusInput,
    ...restProps
  },
  forwardedRef
) => {
  const [field] = useField<string>(name);
  const [show, setShow] = useState<boolean>(false);
  const inputRef = useForwardedRef(forwardedRef);

  useAutoFocus(inputRef, focusInput);

  return (
    <InputGroup>
      <Form.Control
        {...restProps}
        {...field}
        type={show ? "text" : "password"}
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

export default forwardRef(PasswordWidget);
