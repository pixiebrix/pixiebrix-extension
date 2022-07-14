/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

/* eslint-disable filenames/match-exported */

import EditorTabLayout, {
  TabItem,
} from "@/components/tabLayout/EditorTabLayout";
import React, { useState } from "react";
import AskQuestionModal from "@/pageEditor/askQuestion/AskQuestionModal";
import SaveExtensionWizard from "@/pageEditor/panes/save/SaveExtensionWizard";
import useSavingWizard from "@/pageEditor/panes/save/useSavingWizard";
import useActions from "./useActions";
import useLogsBadgeState from "@/pageEditor/tabs/logs/useLogsBadgeState";

const EditorPane: React.FC = () => {
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  const { isWizardOpen } = useSavingWizard();

  const [unreadLogsCount, logsBadgeVariant] = useLogsBadgeState();
  const tabItems: TabItem[] = [
    {
      name: "Edit",
      TabContent: () => <div>Edit</div>,
    },
    {
      name: "Logs",
      badgeCount: unreadLogsCount,
      badgeVariant: logsBadgeVariant,
      TabContent: () => <div>Logs</div>,
      mountWhenActive: true,
    },
  ];

  const buttons = useActions(() => {
    setShowQuestionModal(true);
  });

  return (
    <div className="flex-grow-1">
      <EditorTabLayout tabs={tabItems} actionButtons={buttons} />
      {isWizardOpen && <SaveExtensionWizard />}
      <AskQuestionModal
        showModal={showQuestionModal}
        setShowModal={setShowQuestionModal}
      />
    </div>
  );
};

export default EditorPane;
