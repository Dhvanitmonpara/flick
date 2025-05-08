/* eslint-disable @typescript-eslint/no-explicit-any */
import { env } from "@/conf/env";
import useProfileStore from "@/store/profileStore";
import { IUser } from "@/types/User";
import axios, { AxiosError } from "axios";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

let globalRefreshPromise: Promise<IUser> | null = null;

export const useErrorHandler = () => {
  const { setProfile, removeProfile } = useProfileStore();

  const isComponentMounted = useRef(true);
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      isComponentMounted.current = false;
      abortController.current?.abort();
    };
  }, []);

  // 1) Refresh endpoint
  const refreshAccessToken = useCallback(async (signal?: AbortSignal) => {
    if (!env.serverApiEndpoint) {
      console.error("Missing VITE_SERVER_API_ENDPOINT env variable");
      throw new Error("Server API URL is not defined");
    }

    try {
      const { data } = await axios.post(
        `${env.serverApiEndpoint}/users/refresh`,
        {},
        {
          withCredentials: true,
          signal, // <--- pass AbortSignal to Axios
        }
      );
      setProfile(data);
      return data;
    } catch (error) {
      removeProfile();
      throw error;
    }
  }, [removeProfile, setProfile]);

  // 2) Pull a human‑friendly message out of any Error/AxiosError
  const extractErrorMessage = (
    error: AxiosError | Error,
    fallback: string
  ): string => {
    if (axios.isAxiosError(error)) {
      const safeData = error.response?.data as Record<string, any> | undefined;
      return (
        safeData?.message ||
        safeData?.error ||
        error.message ||
        fallback
      );
    }
    return error.message || fallback;
  };

  const reportError = (message: string, setError?: (msg: string) => void) => {
    if (setError) setError(message); else toast.error(message);
  };

  const handleError = useCallback(async (
    error: AxiosError | Error,
    fallbackMessage: string,
    setError?: (errorMsg: string) => void,
    originalReq?: () => Promise<any>,
    refreshFailMessage = "Session expired, please log in again.",
    onError?: () => void,
    hasRetried = false,
  ): Promise<any> => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const shouldRefresh = error.response.data?.error === "Unauthorized" && !hasRetried;

      if (shouldRefresh) {
        abortController.current = new AbortController();
        const { signal } = abortController.current;

        try {
          if (!globalRefreshPromise) {
            globalRefreshPromise = refreshAccessToken(signal).finally(() => {
              globalRefreshPromise = null;
            });
          }

          await globalRefreshPromise;

          if (!isComponentMounted.current) return;

          if (originalReq) {
            try {
              return await originalReq();
            } catch (retryError) {
              return handleError(
                retryError as AxiosError | Error,
                fallbackMessage,
                setError,
                undefined,
                refreshFailMessage,
                onError,
                true,
              );
            }
          }
          return;
        } catch (refreshError) {
          if (!isComponentMounted.current) return;

          const msg = extractErrorMessage(
            refreshError as AxiosError | Error,
            refreshFailMessage
          );
          reportError(msg, setError);
          onError?.();
          return;
        }
      } else {
        removeProfile();
        reportError("Session expired, please log in again.", setError);
        onError?.();
        return;
      }
    }

    const message = extractErrorMessage(error, fallbackMessage);
    reportError(message, setError);
    onError?.();
  }, [removeProfile, refreshAccessToken]);

  return { handleError };
};