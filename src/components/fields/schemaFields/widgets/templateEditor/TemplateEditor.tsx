/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Slate,
  Editable,
  withReact,
  ReactEditor,
  type RenderLeafProps,
} from "slate-react";
import {
  Text,
  createEditor,
  Range,
  Editor,
  Transforms,
  type NodeEntry,
  type Descendant
} from "slate";
import { withHistory } from "slate-history";

import {
  tokenize,
  serialize,
  deserialize,
  resetNodes,
} from "./TemplateEditorUtils";
import styles from "./TemplateEditor.module.scss";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface LeafProps extends RenderLeafProps {
  leaf: RenderLeafProps["leaf"] & { variable?: boolean, data?: { active: boolean } }
}

const TemplateEditor = React.forwardRef(({ value, onChange, placeholder, className }: Props, ref) => {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [focused, setFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const renderLeaf = useCallback(
    (props: RenderLeafProps) => <Leaf {...props} />,
    []
  );
  const decorate = useCallback(
    ([node, path]: NodeEntry) => {
      const ranges: Array<(Range & { data: { active: boolean } })> = [];
      if (!Text.isText(node)) {
        return ranges;
      }

      const tokens = tokenize(node.text);
      let start = 0;
      for (const token of tokens) {
        const length: number = (typeof token === "string" ? token.length : token.text?.length) || 0;
        const end = start + length;

        if (typeof token !== "string") {
          const range = { anchor: { path, offset: start }, focus: { path, offset: end } };
          // Save whether the cursor is currently on this decoration
          const intersection =
            editor.selection &&
            focused &&
            Range.intersection(range, editor.selection);

          ranges.push({
            ...range,
            [token.type]: true,
            data: { active: Boolean(intersection) },
          });
        }

        start = end;
      }

      return ranges;
    },
    [editor, focused]
  );

  React.useImperativeHandle(ref, () => ({
    focus() {
      ReactEditor.focus(editor);
      // Set cursor to end
      Transforms.select(editor, Editor.end(editor, []));
    },
    set(value_: string) {
      resetNodes(editor, { nodes: deserialize(value_) });
    },
  }));

  useEffect(() => {
    // Resets slate if new value, this avoids cursor jumping while typing
    if (internalValue !== value) {
      resetNodes(editor, { nodes: deserialize(value) });
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Slate
      editor={editor}
      value={deserialize(value)}
      onChange={(value_: Descendant[]) => {
        const serialized = serialize(value_);
        setInternalValue(serialized);
        onChange(serialized);
      }}
    >
      <Editable
        spellCheck={false}
        className={`${styles.textWidget} ${focused ? styles.focus : ""} ${className || ""}`}
        decorate={decorate}
        renderLeaf={renderLeaf}
        placeholder={placeholder || ""}
        onBlur={() => {
          setFocused(false);
        }}
        onFocus={() => {
          setFocused(true);
        }}
      />
    </Slate>
  );
});
TemplateEditor.displayName = "TemplateEditor";

const Leaf = ({ attributes, children, leaf }: LeafProps) => {
  if (leaf.variable) {
    return (
      <span
        {...attributes}
        className={`${styles.variable} ${
          leaf.data.active ? styles.active : ""
        }`}
      >
        {children}
      </span>
    );
  }

  return <span {...attributes}>{children}</span>;
};

export default TemplateEditor;
