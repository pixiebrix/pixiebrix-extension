import React, { useContext } from "react";
import { type BrickOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { useField } from "formik";
import { joinName } from "../../utils/formUtils";
import { isTextLiteralOrNull } from "../../utils/expressionUtils";
import WorkshopMessage from "@/components/fields/schemaFields/WorkshopMessage";
import widgetsRegistry from "@/components/fields/schemaFields/widgets/widgetsRegistry";
import CommentEffect from "./comment";
import FieldRuntimeContext from "@/components/fields/schemaFields/FieldRuntimeContext";
import { type Expression } from "../../types/runtimeTypes";

/**
 * Page Editor fields for the @pixiebrix/comment brick.
 *
 * Shows as a textarea with no toggle/exclude.
 */
const CommentOptions: React.FunctionComponent<BrickOptionProps> = (props) => {
  const { name, configKey = null } = props;

  const context = useContext(FieldRuntimeContext);

  const fieldName = joinName(name, configKey, "comment");

  const [{ value }] = useField<string | Expression>(fieldName);

  if (!isTextLiteralOrNull(value)) {
    return <WorkshopMessage />;
  }

  return (
    <FieldRuntimeContext.Provider
      value={{ ...context, allowExpressions: false }}
    >
      <ConnectedFieldTemplate
        {...props}
        label="Comment"
        description="The comment/note"
        name={fieldName}
        schema={CommentEffect.SCHEMA}
        as={widgetsRegistry.TextWidget}
      />
    </FieldRuntimeContext.Provider>
  );
};

export default CommentOptions;
