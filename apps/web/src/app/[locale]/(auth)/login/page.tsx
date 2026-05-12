import { Suspense } from "react";

import { LoginForm } from "./LoginForm";

export default function LoginPage(): JSX.Element {
  return (
    <main className="mx-auto w-full max-w-md px-6 py-12">
      <Suspense fallback={<div className="bg-surface-subtle h-64 animate-pulse rounded-md" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
