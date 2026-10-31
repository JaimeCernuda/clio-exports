import { ArchiveTransport } from "@clio-ui/lib/session-export/archive-transport";
import {
  type SessionReviewSnapshot,
  type TransportRequest,
} from "@clio/core/v3";
import {
  flowAt,
  studySessionAt,
  studyTasksAt,
  type StudyReplay,
} from "./study-replay-model";

/** Offline reads backed by recorded task ownership and the same as-of transcript clock. */
export class StudyTransport extends ArchiveTransport {
  public at = 0;
  public constructor(public readonly replay: StudyReplay) {
    super(replay.snapshot as SessionReviewSnapshot);
  }
  public override async request<T>(request: TransportRequest<T>): Promise<T> {
    if (
      request.method === "GET" &&
      request.path.endsWith(`/tasks/${this.replay.flows[0].root_handle}/flow`)
    )
      return request.decode(flowAt(this.replay, this.at));
    const task = request.path.match(/^\/v1\/agent-tasks\/([^/]+)$/u);
    if (request.method === "GET" && task) {
      const handle = decodeURIComponent(task[1]);
      const branch = this.replay.study.branches.find(
        (b: { handle: string }) => b.handle === handle,
      );
      const record = studyTasksAt(this.replay, this.at).get(handle);
      if (!branch || !record)
        throw new Error(`Task not yet captured at this time: ${handle}`);
      return request.decode({
        task_id: record.backend.task_id,
        parent_session_id: branch.parent_session_id,
        child_session_id: branch.session_id,
        run_label: branch.title,
        status: record.status,
        live_state: record.activity,
        created_at: record.created_at,
        updated_at: record.updated_at,
      });
    }
    const messages = request.path.match(/^\/v1\/sessions\/([^/]+)\/messages$/u);
    if (request.method === "GET" && messages)
      return request.decode(
        studySessionAt(this.replay, decodeURIComponent(messages[1]), this.at)
          .view,
      );
    return super.request(request);
  }
}
