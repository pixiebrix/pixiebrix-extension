import React, { useCallback, useMemo } from "react";
import { FieldProps } from "@/components/fields/propTypes";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
// @ts-ignore: no types for this one :(
import Select from "react-select-virtualized";
import iconAsSVG, {
  iconOptions,
  IconOption,
  IconConfig,
  IconLibrary,
} from "@/icons/svgIcons";
import { Icon } from "@fortawesome/fontawesome-svg-core";
import { useField } from "formik";
import { fieldLabel } from "@/components/fields/fieldUtils";

// https://github.com/JedWatson/react-select/issues/3480#issuecomment-481566579

const Icon: React.FunctionComponent<{ icon: string; library: IconLibrary }> = ({
  icon,
  library,
}) => (
  <span
    dangerouslySetInnerHTML={{
      __html: iconAsSVG({ id: icon, library, size: 16 }),
    }}
  />
);

function customSingleValue({ data }: { data: IconOption }): JSX.Element {
  return (
    <div className="input-select">
      <div className="input-select__single-value">
        <span className="input-select__icon mr-2">
          <Icon icon={data.value.id} library={data.value.library} />
        </span>
        <span>{data.label}</span>
      </div>
    </div>
  );
}

const IconField: React.FunctionComponent<FieldProps<IconConfig>> = ({
  label,
  ...props
}) => {
  const [field, meta, helpers] = useField(props);

  const setFieldProps = useCallback(
    ({ value }: IconOption) => {
      helpers.setValue({
        id: value.id,
        library: value.library,
        size: meta.value?.size ?? 16,
      });
      helpers.setTouched(true);
      helpers.setError(undefined);
    },
    [helpers]
  );

  const defaultValue = useMemo(() => {
    if (meta.value) {
      const { value } = meta;
      return iconOptions.find(
        (x) => x.value.library === value.library && x.value.id === value.id
      );
    }
  }, [meta.value]);

  return (
    <Form.Group as={Row} controlId={field.name}>
      <Form.Label column sm="2">
        {label ?? fieldLabel(field.name)}
      </Form.Label>
      <Col sm="10">
        <Select
          value={defaultValue}
          options={iconOptions}
          onChange={setFieldProps}
          components={{ SingleValue: customSingleValue }}
        />
        {meta.touched && meta.error && (
          <Form.Control.Feedback type="invalid">
            {meta.error}
          </Form.Control.Feedback>
        )}
      </Col>
    </Form.Group>
  );
};

export default IconField;
