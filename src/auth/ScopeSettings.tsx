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

import styles from "./ScopeSettings.module.scss";

import React, { useCallback } from "react";
import { Formik, FormikBag, FormikValues } from "formik";
import { Alert, Button, Container, Form } from "react-bootstrap";
import * as Yup from "yup";
import { castArray, mapValues } from "lodash";
import { faEyeSlash, faInfo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { StatusCodes } from "http-status-codes";
import { getLinkedApiClient } from "@/services/apiClient";
import { isAxiosError } from "@/errors";
import reportError from "@/telemetry/reportError";
import notify from "@/utils/notify";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { useGetMeQuery } from "@/services/api";

interface Profile {
  scope: string | null;
}

const SCOPE_REGEX = /^@[\da-z~-][\d._a-z~-]*$/;

const VALIDATION_SCHEMA = Yup.object({
  scope: Yup.string()
    .matches(
      SCOPE_REGEX,
      "Your account alias must start with @ followed by lowercase letters and numbers"
    )
    .required(),
});

type ScopeSettingsProps = {
  title?: string;
  description: string;
};

const ScopeSettings: React.VoidFunctionComponent<ScopeSettingsProps> = ({
  title,
  description,
}) => {
  const { refetch: refetchAuth } = useGetMeQuery();

  const submit = useCallback(
    async (
      values: FormikValues,
      { setErrors }: FormikBag<unknown, Profile>
    ) => {
      try {
        await (await getLinkedApiClient()).patch("/api/settings/", values);
      } catch (error) {
        if (!isAxiosError(error)) {
          notify.error({ message: "Error updating account alias", error });
          return;
        }

        switch (error.response.status) {
          case StatusCodes.UNAUTHORIZED: {
            notify.error({
              message: "Could not authenticate with PixieBrix",
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
            notify.error({ message: "Error updating account alias", error });
            return;
          }
        }
      }

      refetchAuth();
    },
    []
  );

  return (
    <div className={styles.root}>
      {title && <div className={styles.title}>{title}</div>}

      <div className="font-weight-bold">{description}</div>

      <Alert variant="info" className="mt-2">
        <p>
          <FontAwesomeIcon icon={faInfo} /> Your account alias is a unique name
          used to prevent duplicate identifiers between the bricks you create
          and public/team bricks.
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
          <Container>
            <Form noValidate onSubmit={handleSubmit} className="mt-2">
              <ConnectedFieldTemplate
                name="scope"
                label="Account Alias"
                placeholder="@peter-parker"
                description="Your @alias for publishing bricks, e.g., @peter-parker"
              />
              <Button type="submit" disabled={isSubmitting || !isValid}>
                Set My Account Alias
              </Button>
            </Form>
          </Container>
        )}
      </Formik>
    </div>
  );
};

export default ScopeSettings;
