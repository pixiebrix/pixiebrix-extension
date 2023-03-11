import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type VFC,
} from "react";

import {
  EditorState,
  ContentState,
  convertFromRaw,
  convertToRaw,
  type RawDraftContentState,
} from "draft-js";
import { Editor } from "react-draft-wysiwyg";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { useField } from "formik";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { isTemplateExpression } from "@/runtime/mapArgs";
import { isMustacheOnly } from "@/components/fields/fieldUtils";
import FieldRuntimeContext from "@/components/fields/schemaFields/FieldRuntimeContext";
import { isKeyStringField } from "@/components/fields/schemaFields/fieldTypeCheckers";
import {
  makeTemplateExpression,
  makeVariableExpression,
} from "@/runtime/expressionCreators";
import { type Schema, type TemplateEngine } from "@/core";
import { trim } from "lodash";
import { getToggleOptions } from "@/components/fields/schemaFields/getToggleOptions";
import styles from "./TemplateTextWidget.module.scss";
import cx from "classnames";
import { getLikelyVariableAtPosition } from "./varPopup/likelyVariableUtils";
import { getIndicesOf } from "@/utils";
import { VariableElement } from "@/components/richText/VariableElement";

export interface TemplateTextWidgetProps {
  name: string;
}

function schemaSupportsTemplates(schema: Schema): boolean {
  const options = getToggleOptions({
    fieldSchema: schema,
    isRequired: false,
    customToggleModes: [],
    isObjectProperty: false,
    isArrayItem: false,
    allowExpressions: true,
  });
  return options.some(
    (option) => option.value === "string" && option.label === "Text"
  );
}

function isVarValue(value: string): boolean {
  return value.startsWith("@") && !value.includes(" ");
}

const getLikelyVarPositions = (template: string) => {
  const varIndicies = getIndicesOf("@", template);
  return varIndicies.map((varIndex) =>
    getLikelyVariableAtPosition(template, varIndex)
  );
};

const variableStrategy = (contentBlock, callback) => {
  const text = contentBlock.getText();
  const likelyVarPositions = getLikelyVarPositions(text);
  for (const varPosition of likelyVarPositions) {
    if (varPosition.name) {
      callback(varPosition.startIndex, varPosition.endIndex);
    }
  }
};

const TemplateTextWidget: VFC<SchemaFieldProps & TemplateTextWidgetProps> = ({
  name,
  schema,
}) => {
  const [{ value, ...restInputProps }, , { setValue }] = useField(name);

  const { allowExpressions: allowExpressionsContext } =
    useContext(FieldRuntimeContext);
  const allowExpressions = allowExpressionsContext && !isKeyStringField(schema);

  const supportsTemplates = useMemo(
    () => schemaSupportsTemplates(schema),
    [schema]
  );

  const onChangeForTemplate = useCallback(
    (templateEngine: TemplateEngine) => {
      const onChange: React.ChangeEventHandler<HTMLInputElement> = ({
        target,
      }) => {
        const changeValue = target.value;
        // Automatically switch to var if user types "@" in the input
        if (templateEngine !== "var" && isVarValue(changeValue)) {
          setValue(makeVariableExpression(changeValue));
        } else if (
          templateEngine === "var" &&
          supportsTemplates &&
          !isVarValue(changeValue)
        ) {
          const trimmed = trim(changeValue);
          const templateValue = isVarValue(trimmed)
            ? changeValue.replace(trimmed, `{{${trimmed}}}`)
            : changeValue;
          setValue(makeTemplateExpression("nunjucks", templateValue));
        } else {
          setValue(makeTemplateExpression(templateEngine, changeValue));
        }
      };

      return onChange;
    },
    [setValue, supportsTemplates]
  );

  const [fieldInputValue, fieldOnChange] = useMemo(() => {
    if (isTemplateExpression(value)) {
      // Convert mustache templates to nunjucks if possible, because the page editor only
      // supports nunjucks, and it doesn't show the template engine anywhere to the user anymore.
      const shouldChangeToNunjucks =
        value.__type__ === "mustache" && !isMustacheOnly(value.__value__);
      return [
        value.__value__,
        shouldChangeToNunjucks
          ? onChangeForTemplate("nunjucks")
          : onChangeForTemplate(value.__type__),
      ];
    }

    const fieldValue = typeof value === "string" ? value : "";
    const onChange: React.ChangeEventHandler<HTMLInputElement> =
      allowExpressions
        ? onChangeForTemplate("nunjucks")
        : (event) => {
            setValue(event.target.value);
          };

    return [fieldValue, onChange];
  }, [allowExpressions, onChangeForTemplate, setValue, value]);

  const [editorState, setEditorState] = useState<EditorState>(() =>
    EditorState.createEmpty()
  );

  useEffect(() => {
    setEditorState(
      EditorState.createWithContent(
        ContentState.createFromText(fieldInputValue)
      )
    );
  }, [fieldInputValue]);

  const getEditorBlockStyle = () => styles.editorBlock;

  const decorators = [
    {
      strategy: variableStrategy,
      component: VariableElement,
    },
  ];

  return (
    <Editor
      toolbarHidden
      editorState={editorState}
      onEditorStateChange={(editorState) => {
        setEditorState(editorState);
      }}
      editorClassName={cx("form-control", styles.root)}
      blockStyleFn={getEditorBlockStyle}
      customDecorators={decorators}
    />
  );
};

export default TemplateTextWidget;
