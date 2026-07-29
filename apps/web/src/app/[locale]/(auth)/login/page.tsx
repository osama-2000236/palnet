import { Suspense } from "react";

import { Skeleton } from "@baydar/ui-web";

import { LoginForm } from "./LoginForm";

export default function LoginPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-md px-6 py-12">
          <Skeleton radius="var(--radius-md)" className="bg-surface-muted h-64 w-full" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
