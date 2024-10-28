import { type NodeAction } from "@/pageEditor/tabs/editTab/editorNodes/nodeActions/NodeActionsView";
import { faPlusCircle, faPaste } from "@fortawesome/free-solid-svg-icons";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { useDispatch } from "react-redux";
import { type PipelineFlavor } from "@/bricks/types";
import usePasteBrick from "@/pageEditor/tabs/editTab/editorNodeLayout/usePasteBrick";
import useApiVersionAtLeast from "@/pageEditor/hooks/useApiVersionAtLeast";
import { useCallback } from "react";

export function useCreateNodeActions() {
  const dispatch = useDispatch();
  const isApiAtLeastV2 = useApiVersionAtLeast("v2");
  const pasteBrick = usePasteBrick();
  const showPaste = pasteBrick && isApiAtLeastV2;

  return useCallback(
    ({
      nodeId,
      pipelinePath,
      flavor,
      index,
      showAddBrick,
    }: {
      nodeId: string;
      pipelinePath: string;
      flavor: PipelineFlavor;
      index: number;
      showAddBrick: boolean;
    }): NodeAction[] => {
      const nodeActions: NodeAction[] = [];

      if (showAddBrick) {
        nodeActions.push({
          name: `${nodeId}-add-brick`,
          icon: faPlusCircle,
          tooltipText: "Add a brick",
          onClick() {
            dispatch(
              actions.showAddBrickModal({
                path: pipelinePath,
                flavor,
                index,
              }),
            );
          },
        });
      }

      if (showPaste) {
        nodeActions.push({
          name: `${nodeId}-paste-brick`,
          icon: faPaste,
          tooltipText: "Paste copied brick",
          async onClick() {
            await pasteBrick(pipelinePath, index);
          },
        });
      }

      return nodeActions;
    },
    [dispatch, pasteBrick, showPaste],
  );
}
