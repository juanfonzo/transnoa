"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { markNotificationsRead } from "@/app/actions/notifications";
import type { NotificationFeed } from "@/lib/notifications";

type NotificationBellProps = {
  feed: NotificationFeed;
};

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17H9m9-2.5V11a6 6 0 0 0-12 0v3.5L4.5 17h15L18 14.5ZM13.75 20a2 2 0 0 1-3.5 0"
      />
    </svg>
  );
}

export function NotificationBell({ feed }: NotificationBellProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [newsRead, setNewsRead] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const unreadInfoCount = newsRead ? 0 : feed.unreadInfoCount;
  const badgeCount = newsRead ? feed.pendingActionCount : feed.badgeCount;

  const handleMarkRead = () => {
    setFeedback("");
    startTransition(async () => {
      const result = await markNotificationsRead();
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }

      setNewsRead(true);
      setFeedback("Novedades marcadas como leídas.");
      router.refresh();
    });
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-label={
          badgeCount > 0
            ? `Notificaciones: ${badgeCount} pendiente${badgeCount === 1 ? "" : "s"}`
            : "Notificaciones"
        }
        aria-expanded={isOpen}
        aria-controls="notification-panel"
        onClick={() => setIsOpen((value) => !value)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        <BellIcon />
        {badgeCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          id="notification-panel"
          aria-label="Notificaciones"
          className="absolute right-0 z-50 mt-3 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="border-b border-slate-200 px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Notificaciones</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {feed.userName} · {feed.pendingActionCount} tarea
                  {feed.pendingActionCount === 1 ? "" : "s"}
                  {unreadInfoCount > 0
                    ? ` · ${unreadInfoCount} novedad${unreadInfoCount === 1 ? "" : "es"}`
                    : ""}
                </p>
              </div>
              {unreadInfoCount > 0 && feed.available && (
                <button
                  type="button"
                  onClick={handleMarkRead}
                  disabled={isPending}
                  className="min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-wait disabled:text-slate-400"
                >
                  {isPending ? "Guardando…" : "Marcar leídas"}
                </button>
              )}
            </div>
          </div>

          {!feed.available ? (
            <div className="px-4 py-8 text-center">
              <p className="font-medium text-slate-800">No pudimos actualizar las alertas</p>
              <p className="mt-1 text-sm text-slate-500">Volvé a intentarlo en unos instantes.</p>
            </div>
          ) : feed.items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="font-medium text-slate-800">Todo al día</p>
              <p className="mt-1 text-sm text-slate-500">No tenés alertas pendientes.</p>
            </div>
          ) : (
            <ul className="max-h-[24rem] divide-y divide-slate-100 overflow-y-auto">
              {feed.items.map((item) => {
                const unread = item.kind === "ACTION" || (item.unread && !newsRead);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`block px-4 py-3.5 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-900 ${
                        unread ? "bg-sky-50/50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            item.kind === "ACTION"
                              ? "bg-amber-500"
                              : unread
                                ? "bg-sky-500"
                                : "bg-slate-300"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              {item.kind === "ACTION" ? "Acción" : unread ? "Nueva" : "Vista"}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                            {item.description}
                          </p>
                          <time dateTime={item.occurredAt} className="mt-1.5 block text-[11px] text-slate-400">
                            {item.occurredLabel}
                          </time>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-3">
            <Link
              href={feed.landingHref}
              onClick={() => setIsOpen(false)}
              className="inline-flex min-h-9 items-center text-xs font-semibold uppercase tracking-wide text-slate-700 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Ir a mi bandeja
            </Link>
            <p aria-live="polite" className="mt-1 text-xs text-slate-500">
              {feedback}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
