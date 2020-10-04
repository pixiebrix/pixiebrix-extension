import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import React, { FunctionComponent } from "react";
import { FieldProps } from "@/components/fields/propTypes";
import { useField } from "formik";
import { fieldLabel } from "@/components/fields/fieldUtils";

const TextField: FunctionComponent<FieldProps<string>> = ({
  label,
  schema,
  ...props
}) => {
  const [{ value, ...field }, meta] = useField(props);
  return (
    <Form.Group as={Row} controlId={field.name}>
      <Form.Label column sm="2">
        {label ?? fieldLabel(field.name)}
      </Form.Label>
      <Col sm="10">
        <Form.Control
          type="text"
          value={value ?? ""}
          {...field}
          isInvalid={!!meta.error}
        />
        {schema.description && (
          <Form.Text className="text-muted">{schema.description}</Form.Text>
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

export default TextField;
