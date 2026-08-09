import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApiClient } from "../api-client";
import {
  EmailDomainChallenge,
  MyVerifications,
  OtpChallenge,
  VerificationState,
  type ConfirmEmailDomainVerificationBody,
  type ConfirmPhoneVerificationBody,
  type RequestBodyVerificationBody,
  type StartEmailDomainVerificationBody,
  type StartPhoneVerificationBody,
} from "../schemas/verification";

/**
 * Verification, for both apps.
 *
 * One factory rather than two copies, the same shape `createSafetyApi` set:
 * the only thing web and mobile disagreed on in the last one was a `"use
 * client"` directive, which is not a reason to maintain two files.
 */

export const verificationQueryKeys = {
  mine: ["verifications", "me"] as const,
};

export function createVerificationsApi(client: ApiClient) {
  const { apiFetch } = client;

  function useMyVerifications() {
    return useQuery({
      queryKey: verificationQueryKeys.mine,
      queryFn: () => apiFetch("/verifications/me", MyVerifications),
      // Verification state changes only when this member acts, and the actions
      // below invalidate it. Refetching on every focus spends bytes on a
      // connection that has few to spare.
      staleTime: 60_000,
    });
  }

  /** Every mutation below lands on the same list, so they share one invalidator. */
  function useRefreshMine() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: verificationQueryKeys.mine });
  }

  function useStartPhoneVerification() {
    const refresh = useRefreshMine();
    return useMutation({
      mutationFn: (body: StartPhoneVerificationBody) =>
        apiFetch("/verifications/phone/start", OtpChallenge, { method: "POST", body }),
      onSuccess: () => refresh(),
    });
  }

  function useConfirmPhoneVerification() {
    const refresh = useRefreshMine();
    return useMutation({
      mutationFn: (body: ConfirmPhoneVerificationBody) =>
        apiFetch("/verifications/phone/confirm", VerificationState, { method: "POST", body }),
      onSuccess: () => refresh(),
    });
  }

  function useStartEmailDomainVerification() {
    const refresh = useRefreshMine();
    return useMutation({
      mutationFn: (body: StartEmailDomainVerificationBody) =>
        apiFetch("/verifications/email-domain/start", EmailDomainChallenge, {
          method: "POST",
          body,
        }),
      onSuccess: () => refresh(),
    });
  }

  function useConfirmEmailDomainVerification() {
    const refresh = useRefreshMine();
    return useMutation({
      mutationFn: (body: ConfirmEmailDomainVerificationBody) =>
        apiFetch("/verifications/email-domain/confirm", VerificationState, {
          method: "POST",
          body,
        }),
      onSuccess: () => refresh(),
    });
  }

  function useRequestBodyVerification() {
    const refresh = useRefreshMine();
    return useMutation({
      mutationFn: (body: RequestBodyVerificationBody) =>
        apiFetch("/verifications/body/request", VerificationState, { method: "POST", body }),
      onSuccess: () => refresh(),
    });
  }

  return {
    useMyVerifications,
    useStartPhoneVerification,
    useConfirmPhoneVerification,
    useStartEmailDomainVerification,
    useConfirmEmailDomainVerification,
    useRequestBodyVerification,
  };
}
