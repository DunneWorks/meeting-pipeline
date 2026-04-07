const ASANA_API_BASE = "https://app.asana.com/api/1.0";

export interface AsanaTask {
  title: string;
  owner: string | null;
  due: string | null;
  context: string;
}

export interface AsanaTaskResult {
  gid: string;
  name: string;
  permalink_url: string;
}

export class AsanaService {
  private accessToken: string;
  private projectGid: string;

  constructor(accessToken: string, projectGid: string) {
    this.accessToken = accessToken;
    this.projectGid = projectGid;
  }

  async createTask(task: AsanaTask): Promise<AsanaTaskResult> {
    const assigneeGid = task.owner ? await this.findAssignee(task.owner) : null;

    const data: Record<string, unknown> = {
      name: task.title,
      notes: task.context,
      projects: [this.projectGid],
    };

    if (assigneeGid) {
      data.assignee = assigneeGid;
    }

    if (task.due) {
      data.due_on = task.due;
    }

    const response = await fetch(`${ASANA_API_BASE}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Asana API error ${response.status}: ${errorText}`);
    }

    const result = await response.json() as { data: AsanaTaskResult };
    return result.data;
  }

  async findAssignee(name: string): Promise<string | null> {
    const response = await fetch(
      `${ASANA_API_BASE}/projects/${this.projectGid}/members?opt_fields=gid,name`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const result = await response.json() as { data: Array<{ gid: string; name: string }> };
    const nameLower = name.toLowerCase();
    const match = result.data.find(
      (member) =>
        member.name.toLowerCase().includes(nameLower) ||
        nameLower.includes(member.name.toLowerCase())
    );

    return match?.gid ?? null;
  }
}
