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

import { ComponentMeta, ComponentStory } from "@storybook/react";
import { Formik } from "formik";
import React, { Suspense, useState } from "react";
import * as yup from "yup";
import {
  Button,
  Col,
  Container,
  Form as BootstrapForm,
  Row,
} from "react-bootstrap";
import { action } from "@storybook/addon-actions";
import DocumentEditor from "./DocumentEditor";
import DocumentPreview from "./DocumentPreview";

const schemaShape: yup.ObjectSchema = yup.object().shape({
  body: yup.string().required(),
});

const initialValues = {
  body: `
type: container
children:
  - type: row
    children:
      - type: column
        children:
          - type: header_1
            config:
              title: My document
          - type: header_2
            config:
              title: Testing the doc
              className: text-danger
          - type: text
            config:
              text: Testing the doc`,
};

const DocumentBuilder: React.FC = () => {
  const [activeElement, setActiveElement] = useState<string>(null);

  return (
    <Formik
      validationSchema={schemaShape}
      initialValues={initialValues}
      onSubmit={action("onSubmit")}
    >
      {({ handleSubmit }) => (
        <BootstrapForm noValidate onSubmit={handleSubmit}>
          <Container>
            <Row>
              <Col>
                <DocumentEditor name="body" />
                <Button type="submit">Submit</Button>
              </Col>
              <Col>
                <DocumentPreview name="body" />
              </Col>
            </Row>
          </Container>
        </BootstrapForm>
      )}
    </Formik>
  );
};

const componentMeta: ComponentMeta<typeof DocumentBuilder> = {
  title: "Document Builder",
  component: DocumentBuilder,
};

const DocumentBuilderTemplate: ComponentStory<typeof DocumentBuilder> = () => (
  <DocumentBuilder />
);

export const Default = DocumentBuilderTemplate.bind({});

export default componentMeta;
