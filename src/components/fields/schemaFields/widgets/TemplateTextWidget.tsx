import clsx from "clsx";
import React, { useCallback, useMemo } from "react";
import { Text, createEditor, type NodeEntry, type Descendant } from "slate";
import { withHistory } from "slate-history";
import { Slate, Editable, withReact, type RenderLeafProps } from "slate-react"
import { type EditableProps } from "slate-react/dist/components/editable";
import styles from "./TemplateTextWidget.module.scss";

type Variants = "highlight";

export interface TemplateTextWidgetProps extends EditableProps {
  value: string;
  variant?: Variants;
}

// Regex to find the template
export const templateRegex = /({{.+?}})|({%.+?%})/g;

export const variableRegex = /(@[\w%]+)/g;


/**
 * Components extends the Slate editor to highlight nunjuck strings.
 */
function TemplateTextWidget({value, ...rest}: TemplateTextWidgetProps){

    // History component allows for undo
    const editor = useMemo(() => withHistory(withReact(createEditor())), [])


    return (<Slate editor={editor} value={getInitialValue(value)}>
    <Editable 
      className={styles.root}
      renderLeaf={props => <Leaf {...props} />}
      decorate={nunjuckTextHighlighter}
      {...rest}
    />
  </Slate>)
}

const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => (
      <span
        {...attributes}
        className={clsx({[styles.template]: leaf.template, [styles.variable]: leaf.variable})}
      >
        {children}
      </span>
    )

// Convert value to match schema
const getInitialValue = (value: string): Descendant[] => [
    {
      children: [
        {
          text: value,
        },
      ],
    },
  ]

export default TemplateTextWidget

/**
 * Accepts a string and and RegExp expression and returns the positions of the results within the string
 * @param text: string to scan
 * @param regex: regex to execute
 * @param offset: number to offset all the positions by. Default 0
 * @returns Array<[start, end]>
 */
export function findRegexIndexes(text:string, regex: RegExp, offset = 0){
  const matches = text.match(regex);
  const positions = [] as Array<[number, number]>;
  let testString = text;
  let matchPointer = 0;

  if(matches){
    for(const match of matches) {
      const matchStartIndex = testString.indexOf(match);
      const matchEndIndex = matchStartIndex + match.length;
      positions.push([matchPointer + matchStartIndex + offset, matchPointer + matchEndIndex + offset]);
      testString = testString.slice(matchEndIndex)
      matchPointer += matchEndIndex;
    }
  }

  return positions
}


// Decorator for Slate Editor 
// https://docs.slatejs.org/concepts/09-rendering#decorations
export function nunjuckTextHighlighter([node, path]: NodeEntry){
    
  /**
    Since the schema is user defined, check to make sure that this node has
    a text value as opposed to another object.
  */
  if (Text.isText(node)) {
    const { text } = node

    // Get index positions of template strings
    const templatePositions = findRegexIndexes(text, templateRegex);

    // Get variable positions within template string
    const variablePositions = templatePositions
      .flatMap(([start, end]) => findRegexIndexes(text.slice(start,end), variableRegex, start));

    // Convert positions to Range object to and set the template and variable attributes
    return ( 
      [...variablePositions.map(([start, end])=> ({
        anchor: { path, offset: start },
        focus: { path, offset: end },
        variable: true,
      })), 
      ...templatePositions.map(([start, end])=> ({
          anchor: { path, offset: start },
          focus: { path, offset: end },
          template: true,
      })),
      ]
    )
  }

  // Fallback if node is something else for some reason.
  return [];
}