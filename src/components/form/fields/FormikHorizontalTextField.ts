import HorizontalTextField, {
  HorizontalTextFieldProps,
} from "./HorizontalTextField";
import { withFormikField } from "./withFormikField";

const FormikHorizontalTextField = withFormikField<
  string,
  HorizontalTextFieldProps
>(HorizontalTextField);
export default FormikHorizontalTextField;
