import React, { useCallback } from "react";
import { DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import { Button, ListGroup } from "react-bootstrap";
import { isEmpty } from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCaretRight } from "@fortawesome/free-solid-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/pageEditor/pageEditorTypes";
import { selectNodeDataPanelTabState } from "@/pageEditor/slices/editorSelectors";
import { actions } from "@/pageEditor/slices/editorSlice";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";

const LEVEL_PADDING_PX = 10;

const ElementNode: React.FunctionComponent<{
  documentBodyName: string;
  elementName: string;
  activeElement: string;
  level: number;
  setActiveElement: (activeElement: string) => void;
  element: DocumentElement;
}> = ({
  documentBodyName,
  elementName,
  activeElement,
  setActiveElement,
  element,
  level,
}) => {
  const dispatch = useDispatch();
  const isActive = activeElement === elementName;

  const { treeExpandedState } = useSelector((state: RootState) =>
    selectNodeDataPanelTabState(state, DataPanelTabKey.Outline)
  );

  // eslint-disable-next-line security/detect-object-injection -- element names are fixed
  const collapsed = treeExpandedState[elementName] ?? false;

  const toggleCollapse = useCallback(
    (next: boolean) => {
      dispatch(
        actions.setNodeDataPanelTabExpandedState({
          tabKey: DataPanelTabKey.Outline,
          expandedState: { ...treeExpandedState, [elementName]: next },
        })
      );
    },
    [dispatch, treeExpandedState, elementName]
  );

  return (
    <>
      <ListGroup.Item
        style={{ paddingLeft: level * LEVEL_PADDING_PX }}
        active={isActive}
        onClick={() => {
          setActiveElement(elementName);
        }}
      >
        {!isEmpty(element.children) && (
          <Button
            variant="light"
            size="sm"
            onClick={() => {
              toggleCollapse(!collapsed);
            }}
          >
            <FontAwesomeIcon icon={collapsed ? faCaretRight : faCaretDown} />
          </Button>
        )}

        {element.type}
      </ListGroup.Item>
      {!collapsed &&
        element.children?.map((childElement, index) => (
          <ElementNode
            key={`${elementName}.children.${index}`}
            documentBodyName={documentBodyName}
            level={level + 1}
            element={childElement}
            activeElement={activeElement}
            elementName={`${elementName}.children.${index}`}
            setActiveElement={setActiveElement}
          />
        ))}
    </>
  );
};

export default ElementNode;
