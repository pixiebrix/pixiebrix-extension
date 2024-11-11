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
import { PageTitle } from "@/layout/Page";
import { faHammer } from "@fortawesome/free-solid-svg-icons";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Button, Form } from "react-bootstrap";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Formik } from "formik";
import Editor, { type EditorValues } from "./Editor";
import useSubmitPackage from "./useSubmitPackage";
import useSetDocumentTitle from "@/hooks/useSetDocumentTitle";

const initialValue: EditorValues = {
  config: "",
  public: false,
  organizations: [],
};

const CreatePage: React.FunctionComponent = () => {
  useSetDocumentTitle("Create Package");

  const { submit, validate } = useSubmitPackage({
    create: true,
  });

  return (
    <Formik onSubmit={submit} validate={validate} initialValues={initialValue}>
      {({ values, isValid, handleSubmit }) => (
        <Form noValidate onSubmit={handleSubmit} autoComplete="off">
          <div className="d-flex">
            <div className="flex-grow-1">
              <PageTitle
                icon={faHammer}
                title="Create New Package"
                documentationUrl="https://docs.pixiebrix.com/developing-mods/advanced-workshop"
              />
            </div>
            <div className="flex-grow-1 text-right">
              <Button disabled={!isValid} type="submit">
                {values.public ? "Publish Package" : "Create Package"}
              </Button>
            </div>
          </div>
          <div className="pb-4">
            <p>
              Create a new package and optionally share it with your teammates
              and/or the PixieBrix community
            </p>
          </div>

          <Editor showLogs={false} />
        </Form>
      )}
    </Formik>
  );
};

export default CreatePage;
