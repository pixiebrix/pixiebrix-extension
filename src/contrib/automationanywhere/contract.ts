export interface ListResponse<TData> {
  page: {
    offset: number;
    total: number;
    totalFilter: number;
  };
  list: TData[];
}

export const BOT_TYPE = "application/vnd.aa.taskbot";

export interface Variable {
  name: string;
  input: boolean;
  type: "STRING";
  description: string;
}

export interface Interface {
  variables: Variable[];
}

// https://docs.automationanywhere.com/bundle/enterprise-v11.3/page/enterprise/topics/control-room/control-room-api/orchestrator-bot-details.html
export interface Bot {
  id: string;
  parentId: string;
  name: string;
  path: string;
  type: typeof BOT_TYPE;
}

export interface Device {
  id: string;
  type: string;
  hostName: string;
  status: "CONNECTED";
  botAgentVersion: string;
  nickname: string;
}
