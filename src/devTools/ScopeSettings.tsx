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

import React, { useCallback } from "react";
import { Formik, FormikBag, FormikValues, useField } from "formik";
import { Form, Button, Row, Col, Alert } from "react-bootstrap";
import * as Yup from "yup";
import { useToasts } from "react-toast-notifications";
import axios, { AxiosResponse } from "axios";
import { mapValues, castArray } from "lodash";
import { makeURL } from "@/hooks/fetch";
import { getExtensionToken } from "@/auth/token";
import { faInfo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface Profile {
  scope: string | null;
}

const SCOPE_REGEX = /^@[a-z0-9-~][a-z0-9-._~]*$/;

interface FieldProps {
  placeholder?: string;
  name: string;
  label: string;
  description?: string;
  readonly?: boolean;
}

const TextField: React.FunctionComponent<FieldProps> = ({
  name,
  placeholder,
  label,
  description,
  readonly,
}) => {
  const [{ value, ...field }, meta] = useField(name);
  return (
    <Form.Group as={Row} controlId={field.name}>
      <Form.Label column sm="2">
        {label}
      </Form.Label>
      <Col sm="10">
        {readonly ? (
          <Form.Control plaintext readOnly value={value} />
        ) : (
          <Form.Control
            type="text"
            placeholder={placeholder}
            value={value ?? ""}
            {...field}
            isInvalid={!!meta.error}
          />
        )}
        {description && (
          <Form.Text className="text-muted">{description}</Form.Text>
        )}
        {meta.touched && meta.error && (
          <Form.Control.Feedback type="invalid">
            {meta.error}
          </Form.Control.Feedback>
        )}
      </Col>
    </Form.Group>
  );
};

const ScopeSettings: React.FunctionComponent = () => {
  const { addToast } = useToasts();

  const submit = useCallback(
    async (
      values: FormikValues,
      { setErrors }: FormikBag<unknown, Profile>
    ) => {
      let response: AxiosResponse<unknown>;
      try {
        response = await axios.patch(await makeURL("/api/settings/"), values, {
          headers: { Authorization: `Token ${await getExtensionToken()}` },
        });
      } catch (err) {
        if (err.response.status === 401) {
          addToast("Could not authenticate with PixieBrix", {
            appearance: "error",
            autoDismiss: true,
          });
        } else if (err.response.status === 400) {
          setErrors(mapValues(err.response.data, (xs) => castArray(xs)[0]));
        } else {
          console.error(response.data);
          addToast("Error updating account scope", {
            appearance: "error",
            autoDismiss: true,
          });
        }
        return;
      }
      addToast("Set account scope", {
        appearance: "success",
        autoDismiss: true,
      });
      location.reload();
    },
    [addToast]
  );

  return (
    <Row>
      <Col md={8} lg={6} className="mx-auto">
        <div className="mt-2">
          <b>
            To create extensions, you must first set a scope for your PixieBrix
            account
          </b>
        </div>

        <Alert variant="info" className="mt-2">
          <FontAwesomeIcon icon={faInfo} /> Your scope is used to namespace
          bricks you create, so their ids don&apos;t conflict with the ids of
          public and team bricks.
        </Alert>

        <Formik
          onSubmit={submit}
          enableReinitialize
          initialValues={{ scope: "" }}
          validationSchema={Yup.object({
            scope: Yup.string()
              .matches(
                SCOPE_REGEX,
                "Your scope must be @ followed by lowercase letters and numbers"
              )
              .required(),
          })}
        >
          {({ handleSubmit, isSubmitting, isValid }) => (
            <Form noValidate onSubmit={handleSubmit} className="mt-2">
              <TextField
                placeholder="@username"
                name="scope"
                description="Your @scope for publishing bricks."
                label="Scope"
              />
              <Button type="submit" disabled={isSubmitting || !isValid}>
                Set My Scope
              </Button>
            </Form>
          )}
        </Formik>
      </Col>
    </Row>
  );
};

export default ScopeSettings;
