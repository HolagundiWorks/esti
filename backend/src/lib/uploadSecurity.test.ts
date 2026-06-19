import { describe, expect, it, vi, beforeEach } from "vitest";
import { UPLOAD_PASSWORD_FIELD } from "@esti/contracts";
import {
  UPLOAD_PASSWORD_INVALID_MESSAGE,
  UPLOAD_PASSWORD_REQUIRED_MESSAGE,
  verifyUploadPassword,
} from "./uploadSecurity.js";

const getOrgSettings = vi.fn();

vi.mock("./settings.js", () => ({
  getOrgSettings: (...args: unknown[]) => getOrgSettings(...args),
}));

const verifyPassword = vi.fn();

vi.mock("../auth/session.js", () => ({
  verifyPassword: (...args: unknown[]) => verifyPassword(...args),
}));

describe("verifyUploadPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows uploads when password gate is off", async () => {
    getOrgSettings.mockResolvedValue({
      uploadPasswordRequired: false,
      uploadPasswordHash: null,
    });
    await expect(verifyUploadPassword({} as never, {})).resolves.toBeNull();
  });

  it("requires password when gate is on", async () => {
    getOrgSettings.mockResolvedValue({
      uploadPasswordRequired: true,
      uploadPasswordHash: "hash",
    });
    await expect(verifyUploadPassword({} as never, {})).resolves.toEqual({
      status: 403,
      error: UPLOAD_PASSWORD_REQUIRED_MESSAGE,
    });
  });

  it("rejects wrong password", async () => {
    getOrgSettings.mockResolvedValue({
      uploadPasswordRequired: true,
      uploadPasswordHash: "hash",
    });
    verifyPassword.mockResolvedValue(false);
    await expect(
      verifyUploadPassword({} as never, { [UPLOAD_PASSWORD_FIELD]: "wrong" }),
    ).resolves.toEqual({
      status: 403,
      error: UPLOAD_PASSWORD_INVALID_MESSAGE,
    });
  });

  it("accepts correct password", async () => {
    getOrgSettings.mockResolvedValue({
      uploadPasswordRequired: true,
      uploadPasswordHash: "hash",
    });
    verifyPassword.mockResolvedValue(true);
    await expect(
      verifyUploadPassword({} as never, { [UPLOAD_PASSWORD_FIELD]: "secret" }),
    ).resolves.toBeNull();
  });
});
