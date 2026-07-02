import { describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { UPLOAD_ROUTE_CAPABILITIES } from "../auth/upload.js";
import { registerImageUploadRoute } from "./imageUploadRoute.js";

describe("registerImageUploadRoute", () => {
  it("registers a POST handler with upload capability metadata", () => {
    const posts: { path: string; opts: unknown }[] = [];
    const app = {
      post(path: string, opts: unknown, _handler: unknown) {
        posts.push({ path, opts });
      },
    } as unknown as FastifyInstance;

    registerImageUploadRoute(app, {
      path: "/upload/inspection-photo",
      requiredField: "inspectionId",
      notFoundError: "inspection not found",
      resolveParent: async () => null,
      storageKey: (_parentId, hash, ext) => `photos/${hash}${ext}`,
      insertRow: async () => ({ id: "00000000-0000-0000-0000-000000000001" }),
      audit: () => ({
        entity: "inspection_photo",
        entityId: "00000000-0000-0000-0000-000000000001",
        action: "UPLOAD",
        actorId: "00000000-0000-0000-0000-000000000001",
        after: { storageKey: "photos/test.jpg" },
      }),
    });

    expect(posts).toHaveLength(1);
    expect(posts[0]?.path).toBe("/upload/inspection-photo");
    expect(UPLOAD_ROUTE_CAPABILITIES["/upload/inspection-photo"]).toBe("write");
    expect(posts[0]?.opts).toEqual({
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    });
  });
});
