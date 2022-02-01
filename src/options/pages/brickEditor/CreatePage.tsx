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

import React from "react";
import { PageTitle } from "@/layout/Page";
import { faHammer } from "@fortawesome/free-solid-svg-icons";
import { Row, Col, Button, Form } from "react-bootstrap";
import { Formik } from "formik";
import Editor, { EditorValues } from "./Editor";
import useSubmitBrick from "./useSubmitBrick";
import { useTitle } from "@/hooks/title";

const initialValue: EditorValues = {
  config: "",
  public: false,
  organizations: [],
};

const CreatePage: React.FunctionComponent = () => {
  useTitle("Create Brick");

  const { submit, validate } = useSubmitBrick({
    url: "api/bricks/",
    create: true,
  });

  return (
    <Formik onSubmit={submit} validate={validate} initialValues={initialValue}>
      {({ values, isValid, handleSubmit }) => (
        <Form noValidate onSubmit={handleSubmit} autoComplete="off">
          <div className="d-flex">
            <div className="flex-grow-1">
              <PageTitle icon={faHammer} title="Create New Brick" />
            </div>
            <div className="flex-grow-1 text-right">
              <Button disabled={!isValid} type="submit">
                {values.public ? "Publish Brick" : "Create Brick"}
              </Button>
            </div>
          </div>
          <div className="pb-4">
            <p>
              Create a new brick and optionally share it with your teammates
              and/or the PixieBrix community
            </p>
          </div>

          <Row>
            <Col xl={8} lg={10} md={12}>
              <Editor logContext={null} showLogs={false} />
            </Col>
          </Row>
        </Form>
      )}
    </Formik>
  );
};

export default CreatePage;
