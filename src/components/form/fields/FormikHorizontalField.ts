import HorizontalField, { HorizontalFieldProps } from "./HorizontalField";
import { withFormikField } from "./withFormikField";

const FormikHorizontalField = withFormikField<string, HorizontalFieldProps>(
  HorizontalField
);
export default FormikHorizontalField;
