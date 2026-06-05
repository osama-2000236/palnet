import { Suspense } from "react";

import { Skeleton } from "@baydar/ui-web";

import { LoginForm } from "./LoginForm";

export default function LoginPage(): JSX.Element {
  return (
    <main className="mx-auto w-full max-w-md px-6 py-12">
      <Suspense
        fallback={<Skeleton radius="var(--radius-md)" className="bg-surface-muted h-64 w-full" />}
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
