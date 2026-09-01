"use client";

// New message — REFACTORED to consume the new ui-web atoms (Sweep PR).
//
// Changes from `main`:
//   • 2 raw <input> fields (room title, member search) replaced with
//     <Input>. Search input gains a leading <Icon name="search"/>.
//   • Inline `<p role="alert">` error replaced with <Alert kind="danger">.
//   • "Selected" pill on each row now uses <Chip size="sm" active>.
//
// Otherwise unchanged.

import {
  ChatRoom as ChatRoomSchema,
  ConnectionListItem,
  type ConnectionListItem as ConnectionListItemType,
} from "@baydar/shared";
import { Alert, Avatar, Button, Chip, Input, SearchField, Surface } from "@baydar/ui-web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { apiFetch, apiFetchPage } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";
import { readSession } from "@/lib/session";

const ConnectionsEnvelope = z.object({ data: z.array(ConnectionListItem) });

export default function NewMessagePage(): JSX.Element {
  const t = useTranslations("messaging");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [connections, setConnections] = useState<ConnectionListItemType[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const tErrors = useTranslations("errors");
  const tErrorsRef = useRef(tErrors);
  useEffect(() => {
    tErrorsRef.current = tErrors;
  }, [tErrors]);

  // `.then().finally()` with no `catch`: a failed contact list left
  // `connections` at `[]` and the screen said "no matching contacts" — the
  // empty-state collapse this loop has closed on `/network` (#159), the room
  // list (#160) and the job page (#163). The mobile twin has always caught it.
  const loadConnections = useCallback(async (accessToken: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const out = await apiFetchPage("/connections?filter=ACCEPTED", ConnectionsEnvelope, {
        token: accessToken,
      });
      setConnections(out.data);
    } catch (caught) {
      setLoadError(toErrorMessage(caught, tErrorsRef.current));
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setToken(session.tokens.accessToken);
    void loadConnections(session.tokens.accessToken);
  }, [router, loadConnections]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return connections;
    return connections.filter((item) =>
      [item.user.firstName, item.user.lastName, item.user.handle, item.user.headline]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
        .includes(needle),
    );
  }, [connections, query]);

  async function submit(): Promise<void> {
    if (!token) return;
    setError(null);
    if (selectedIds.size < 2 || title.trim().length === 0) {
      setError(t("newGroup.validation"));
      return;
    }
    setSubmitting(true);
    try {
      const room = await apiFetch("/messaging/rooms", ChatRoomSchema, {
        method: "POST",
        token,
        body: {
          isGroup: true,
          memberIds: Array.from(selectedIds),
          title: title.trim(),
        },
      });
      router.push(`/messages?roomId=${room.id}`);
    } catch {
      setError(t("newGroup.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  function toggle(userId: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-ink text-2xl font-semibold">{t("newGroup.title")}</h1>
          <p className="text-ink-muted mt-1 text-sm">{t("newGroup.subtitle")}</p>
        </div>
        <Link
          href="/messages"
          className="border-line-soft text-ink-muted hover:bg-surface-subtle rounded-md border px-3 py-2 text-sm"
        >
          {t("edit.cancel")}
        </Link>
      </div>

      <Surface variant="card" padding="5" className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-ink text-sm font-semibold">{t("newGroup.roomTitle")}</span>
          <Input
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            placeholder={t("newGroup.roomTitlePlaceholder")}
            error={error === t("newGroup.validation") && title.trim().length === 0}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-ink text-sm font-semibold">{t("newGroup.search")}</span>
          <SearchField
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            onClear={() => setQuery("")}
            clearLabel={tCommon("clear")}
            placeholder={t("newGroup.searchPlaceholder")}
            containerClassName="w-full"
          />
        </label>

        {error ? <Alert kind="danger" body={error} /> : null}

        <div className="flex flex-col gap-2">
          {loading ? (
            <p className="text-ink-muted text-sm">{t("newGroup.loading")}</p>
          ) : loadError ? (
            <Alert
              kind="danger"
              body={loadError}
              cta={tCommon("retry")}
              onAction={() => token && void loadConnections(token)}
            />
          ) : filtered.length === 0 ? (
            <p className="text-ink-muted text-sm">{t("newGroup.empty")}</p>
          ) : (
            filtered.map((item) => {
              const selected = selectedIds.has(item.user.userId);
              const name =
                `${item.user.firstName} ${item.user.lastName}`.trim() || item.user.handle;
              return (
                <button
                  key={item.user.userId}
                  type="button"
                  onClick={() => toggle(item.user.userId)}
                  aria-pressed={selected}
                  className="border-line-soft hover:bg-surface-subtle flex items-center gap-3 rounded-md border p-3 text-start"
                >
                  <Avatar
                    size="md"
                    user={{
                      id: item.user.userId,
                      handle: item.user.handle,
                      firstName: item.user.firstName,
                      lastName: item.user.lastName,
                      avatarUrl: item.user.avatarUrl ?? null,
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-ink block truncate text-sm font-semibold">{name}</span>
                    {item.user.headline ? (
                      <span className="text-ink-muted block truncate text-xs">
                        {item.user.headline}
                      </span>
                    ) : null}
                  </span>
                  <Chip size="sm" active={selected}>
                    {selected ? t("newGroup.selected") : t("newGroup.select")}
                  </Chip>
                </button>
              );
            })
          )}
        </div>

        <div className="flex justify-end">
          <Button
            variant="primary"
            loading={submitting}
            disabled={selectedIds.size < 2 || title.trim().length === 0}
            onClick={() => void submit()}
          >
            {t("newGroup.submit")}
          </Button>
        </div>
      </Surface>
    </main>
  );
}
