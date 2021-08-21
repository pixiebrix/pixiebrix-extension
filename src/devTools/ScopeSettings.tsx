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
import { Formik, FormikBag, FormikValues, useField } from "formik";
import { Alert, Button, Col, Form, Row } from "react-bootstrap";
import * as Yup from "yup";
import { castArray, mapValues } from "lodash";
import { faEyeSlash, faInfo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { reportError } from "@/telemetry/logging";
import { StatusCodes } from "http-status-codes";
import { getLinkedApiClient } from "@/services/apiClient";
import { isAxiosError } from "@/errors";
import useNotifications from "@/hooks/useNotifications";

interface Profile {
  scope: string | null;
}

const SCOPE_REGEX = /^@[\da-z~-][\d._a-z~-]*$/;

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
            isInvalid={Boolean(meta.error)}
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

const VALIDATION_SCHEMA = Yup.object({
  scope: Yup.string()
    .matches(
      SCOPE_REGEX,
      "Your account alias must start with @ followed by lowercase letters and numbers"
    )
    .required(),
});

const ScopeSettings: React.FunctionComponent = () => {
  const notify = useNotifications();

  const submit = useCallback(
    async (
      values: FormikValues,
      { setErrors }: FormikBag<unknown, Profile>
    ) => {
      try {
        await (await getLinkedApiClient()).patch("/api/settings/", values);
      } catch (error: unknown) {
        if (!isAxiosError(error)) {
          notify.error("Error updating account alias", {
            error,
          });
          return;
        }

        switch (error.response.status) {
          case StatusCodes.UNAUTHORIZED: {
            notify.error("Could not authenticate with PixieBrix", {
              error,
            });
            return;
          }

          case StatusCodes.BAD_REQUEST: {
            setErrors(mapValues(error.response.data, (xs) => castArray(xs)[0]));
            return;
          }

          default: {
            reportError(error);
            notify.error("Error updating account alias", {
              error,
            });
            return;
          }
        }
      }

      location.reload();
    },
    [notify]
  );

  return (
    <Row className="vh-100">
      <Col md={8} lg={6} className="mx-auto vh-100 overflow-auto">
        <div className="PaneTitle">Welcome to the PixieBrix Page Editor!</div>

        <div className="font-weight-bold">
          To create extensions, you must first set an account alias for your
          PixieBrix account
        </div>

        <Alert variant="info" className="mt-2">
          <p>
            <FontAwesomeIcon icon={faInfo} /> Your account alias is a unique
            name used to prevent duplicate identifiers between the bricks you
            create and public/team bricks.
          </p>
        </Alert>

        <Alert variant="info" className="mt-2">
          <p>
            <FontAwesomeIcon icon={faEyeSlash} /> You account alias will not be
            visible to anyone unless you choose to share a brick or extension.
          </p>
        </Alert>

        <Formik
          onSubmit={submit}
          enableReinitialize
          initialValues={{ scope: "" }}
          validationSchema={VALIDATION_SCHEMA}
        >
          {({ handleSubmit, isSubmitting, isValid }) => (
            <Form noValidate onSubmit={handleSubmit} className="mt-2">
              <TextField
                placeholder="@peter-parker"
                name="scope"
                description="Your @alias for publishing bricks, e.g., @peter-parker"
                label="Account Alias"
              />
              <Button type="submit" disabled={isSubmitting || !isValid}>
                Set My Account Alias
              </Button>
            </Form>
          )}
        </Formik>
      </Col>
    </Row>
  );
};

export default ScopeSettings;
