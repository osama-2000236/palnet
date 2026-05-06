import { Button } from "@baydar/ui-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AuthError, AuthScaffold } from "@/components/auth/AuthScaffold";
import { confirmVerifyEmailAction } from "@/lib/auth-actions";

export default function VerifyEmailScreen(): JSX.Element {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    let active = true;
    confirmVerifyEmailAction(token)
      .then(() => {
        if (active) setStatus("success");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <AuthScaffold
      appName={t("common.appName")}
      kicker={t("auth.verify.kicker")}
      title={t("auth.verify.title")}
      subtitle={
        status === "loading"
          ? t("auth.verify.loading")
          : status === "success"
            ? t("auth.verify.success")
            : t("auth.verify.error")
      }
      testID="verify-email-screen"
    >
      {status === "error" ? <AuthError message={t("auth.verify.error")} /> : null}
      <Button
        fullWidth
        size="lg"
        testID="verify-email-login"
        accessibilityLabel={t("auth.verify.backToLogin")}
        onPress={() => router.replace("/(auth)/login")}
      >
        {t("auth.verify.backToLogin")}
      </Button>
    </AuthScaffold>
  );
}
