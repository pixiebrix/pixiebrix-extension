import React from "react";
import { PageTitle } from "@/layout/Page";
import { faHammer } from "@fortawesome/free-solid-svg-icons";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import { Formik } from "formik";
import { useFetch } from "@/hooks/fetch";
import Form from "react-bootstrap/Form";
import { useParams } from "react-router";
import Editor from "./Editor";
import { GridLoader } from "react-spinners";
import useSubmitBrick from "./useSubmitBrick";

interface BrickData {
  id: string;
  config: string;
  organizations: string[];
  public: boolean;
}

const EditPage: React.FunctionComponent = ({}) => {
  const { id } = useParams<{ id: string }>();

  const url = `api/bricks/${id}/`;

  const data = useFetch<BrickData>(url);

  const { submit, validate } = useSubmitBrick({ url, create: false });

  if (!data) {
    return (
      <>
        <div className="d-flex">
          <div className="flex-grow-1">
            <PageTitle icon={faHammer} title="Edit Brick" />
          </div>
          <div className="flex-grow-1 text-right">
            <Button disabled>Update Brick</Button>
          </div>
        </div>
        <div>
          <GridLoader />
        </div>
      </>
    );
  }

  return (
    <Formik onSubmit={submit} validate={validate} initialValues={data}>
      {({ values, isValid, handleSubmit }) => (
        <Form noValidate onSubmit={handleSubmit} autoComplete="off">
          <div className="d-flex">
            <div className="flex-grow-1">
              <PageTitle icon={faHammer} title="Edit Brick" />
            </div>
            <div className="flex-grow-1 text-right">
              <Button disabled={!isValid} type="submit">
                {values.public ? "Publish Brick" : "Update Brick"}
              </Button>
            </div>
          </div>

          <Row>
            <Col className="mt-4" xl={8} lg={10} md={12}>
              <Editor />
            </Col>
          </Row>
        </Form>
      )}
    </Formik>
  );
};

export default EditPage;
