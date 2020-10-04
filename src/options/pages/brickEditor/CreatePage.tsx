import React from "react";
import { PageTitle } from "@/layout/Page";
import { faHammer } from "@fortawesome/free-solid-svg-icons";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import { Formik } from "formik";
import Form from "react-bootstrap/Form";
import Editor, { EditorValues } from "./Editor";
import useSubmitBrick from "./useSubmitBrick";

interface OwnProps {}

const initialValue: EditorValues = {
  config: "",
  public: false,
  organizations: [],
};

const CreatePage: React.FunctionComponent<OwnProps> = ({}) => {
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
              <Editor showTemplates />
            </Col>
          </Row>
        </Form>
      )}
    </Formik>
  );
};

export default CreatePage;
