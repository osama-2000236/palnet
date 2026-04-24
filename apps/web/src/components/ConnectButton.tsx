"use client";

import type { Profile } from "@palnet/shared";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { z } from "zod";

const Raw = z.object({}).passthrough();

interface ConnectButtonProps {
  targetUserId: string;
  viewer: Profile["viewer"];
  onChange?: (next: Profile["viewer"]) => void;
}

export function ConnectButton({
  targetUserId,
  viewer,
  onChange,
}: ConnectButtonProps): JSX.Element | null {
  const t = useTranslations("network");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!viewer) return null;
  if (viewer.isSelf) return null;

  const conn = viewer.connection;

  async function send(): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const data = (await apiFetch("/connections", Raw, {
        method: "POST",
        token,
        body: { receiverId: targetUserId },
      })) as { id: string };
      onChange?.({
        isSelf: false,
        connection: {
          status: "PENDING",
          direction: "OUTGOING",
          connectionId: data.id,
        },
      });
    } catch {
      setError(t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(id: string): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(`/connections/${id}/withdraw`, Raw, {
        method: "POST",
        token,
      });
      onChange?.({ isSelf: false, connection: null });
    } finally {
      setBusy(false);
    }
  }

  async function respond(id: string, action: "ACCEPT" | "DECLINE"): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(`/connections/${id}/respond`, Raw, {
        method: "POST",
        token,
        body: { action },
      });
      onChange?.({
        isSelf: false,
        connection: {
          status: action === "ACCEPT" ? "ACCEPTED" : "DECLINED",
          direction: "INCOMING",
          connectionId: id,
        },
      });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(`/connections/${id}`, Raw, {
        method: "DELETE",
        token,
      });
      onChange?.({ isSelf: false, connection: null });
    } finally {
      setBusy(false);
    }
  }

  const buttonClasses =
    "rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-ink-inverse shadow-card disabled:opacity-60";
  const secondary =
    "rounded-md border border-ink-muted/30 px-4 py-2 text-sm text-ink hover:bg-ink-muted/5 disabled:opacity-60";

  // Not connected, no prior row (or prior is withdrawn/declined).
  if (!conn || conn.status === "WITHDRAWN" || conn.status === "DECLINED") {
    return (
      <div className="flex flex-col gap-1">
        <button type="button" onClick={send} disabled={busy} className={buttonClasses}>
          {t("connect")}
        </button>
        {error ? <span className="text-danger text-xs">{error}</span> : null}
      </div>
    );
  }

  if (conn.status === "PENDING" && conn.direction === "OUTGOING") {
    return (
      <button
        type="button"
        onClick={() => void withdraw(conn.connectionId)}
        disabled={busy}
        className={secondary}
      >
        {t("withdraw")}
      </button>
    );
  }

  if (conn.status === "PENDING" && conn.direction === "INCOMING") {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void respond(conn.connectionId, "ACCEPT")}
          disabled={busy}
          className={buttonClasses}
        >
          {t("accept")}
        </button>
        <button
          type="button"
          onClick={() => void respond(conn.connectionId, "DECLINE")}
          disabled={busy}
          className={secondary}
        >
          {t("decline")}
        </button>
      </div>
    );
  }

  if (conn.status === "ACCEPTED") {
    return (
      <button
        type="button"
        onClick={() => void remove(conn.connectionId)}
        disabled={busy}
        className={secondary}
      >
        {t("removeConnection")}
      </button>
    );
  }

  return null;
}
