import SwitchButton, { SwitchButtonProps } from "./SwitchButton";
import { withFormikField } from "./withFormikField";

const FormikSwitchButton = withFormikField<boolean, SwitchButtonProps>(
  SwitchButton
);
export default FormikSwitchButton;
