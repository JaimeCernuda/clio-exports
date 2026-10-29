import { type ClioTransport, type TransportRequest } from "@clio/core/v3";
import { ArchiveTransport } from "@clio-ui/lib/session-export/archive-transport";
import {
  capturedAttention,
  capturedAttentionRequest,
  type PairedReplay,
} from "./paired-replay";
import type { SessionReviewSnapshot } from "@clio/core/v3";

/** Read exact captured inspection responses; all other operations keep the archive's read-only rules. */
export class PairedAttentionTransport implements ClioTransport {
  private readonly archive: ArchiveTransport;
  constructor(private readonly pair: PairedReplay) {
    this.archive = new ArchiveTransport(pair.snapshot as SessionReviewSnapshot);
  }
  async request<T>(request: TransportRequest<T>): Promise<T> {
    if (
      new URLSearchParams(location.search).get("debugAttention") === "1" &&
      request.path.includes("/attention") &&
      request.method === "POST"
    )
      console.info(
        "CLIO_REPLAY_ATTENTION_REQUEST " +
          JSON.stringify({ path: request.path, body: request.body }),
      );
    const availability = request.path.match(
      /^\/v1\/sessions\/([^/]+)\/attention\/availability$/,
    );
    if (request.method === "GET" && availability) {
      const primary = this.pair.sessions.find((s) => s.role === "primary")!;
      return request.decode({
        enabled: availability[1] === primary.session.id,
        messages: Object.fromEntries(
          this.pair.attention.knownAnswers.map((id) => [id, true]),
        ),
      });
    }
    const selection = request.path.match(
      /^\/v1\/sessions\/([^/]+)\/messages\/([^/]+)\/attention$/,
    );
    if (request.method === "POST" && selection) {
      return request.decode(
        capturedAttention(
          this.pair.attention,
          this.pair.source.sha256,
          decodeURIComponent(selection[1]),
          decodeURIComponent(selection[2]),
          request.body as Parameters<typeof capturedAttention>[4],
        ),
      );
    }
    const auxiliary = request.path.match(
      /^\/v1\/sessions\/([^/]+)\/messages\/([^/]+)\/(attention\/items(?:\/export)?)$/,
    );
    if (request.method === "POST" && auxiliary) {
      return request.decode(
        capturedAttentionRequest(
          this.pair.attention,
          this.pair.source.sha256,
          decodeURIComponent(auxiliary[1]),
          decodeURIComponent(auxiliary[2]),
          auxiliary[3],
          request.body,
        ),
      );
    }
    return this.archive.request(request);
  }
  stream(): AsyncIterable<never> {
    return this.archive.stream();
  }
}
