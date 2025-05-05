/* eslint-disable @typescript-eslint/no-explicit-any */
import { env } from "@/conf/env";
import useProfileStore from "@/store/profileStore";
import axios, { AxiosError } from "axios";
import { useCallback } from "react";
import { toast } from "sonner";

let globalRefreshPromise: Promise<any> | null = null;

export const useErrorHandler = () => {
  const { setProfile, removeProfile } = useProfileStore();

  // 1) Refresh endpoint
  const refreshAccessToken = useCallback(async () => {
    if (!env.serverApiEndpoint) {
      console.error("Missing VITE_SERVER_API_ENDPOINT env variable");
      throw new Error("Server API URL is not defined");
    }
    
    try {
      const { data } = await axios.post(
        `${env.serverApiEndpoint}/users/refresh`,
        {},
        { withCredentials: true }
      );
      setProfile(data);
      return data;
    } catch (error) {
      // If refresh fails, clear the profile and rethrow
      removeProfile();
      throw error;
    }
  }, [removeProfile, setProfile])

  // 2) Pull a human‑friendly message out of any Error/AxiosError
  const extractErrorMessage = (
    error: AxiosError | Error,
    fallback: string
  ): string => {
    if (axios.isAxiosError(error)) {
      return (
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        fallback
      );
    }
    return error.message || fallback;
  };
  
  const handleError = useCallback(async (
    error: AxiosError | Error,
    fallbackMessage: string,
    setError?: (errorMsg: string) => void,
    originalReq?: () => Promise<any>,
    hasRetried = false
  ): Promise<any> => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const shouldRefresh = error.response.data?.error === "Unauthorized" && !hasRetried;
  
      if (shouldRefresh) {
        try {
          if (!globalRefreshPromise) {
            globalRefreshPromise = refreshAccessToken().finally(() => {
              globalRefreshPromise = null;
            });
          }
  
          await globalRefreshPromise;
  
          if (originalReq) {
            try {
              return await originalReq();
            } catch (retryError) {
              return handleError(
                retryError as AxiosError | Error,
                fallbackMessage,
                setError,
                undefined,
                true
              );
            }
          }
          return;
        } catch (refreshError) {
          const msg = extractErrorMessage(
            refreshError as AxiosError | Error,
            "Session expired, please log in again."
          );
          if (setError) {
            setError(msg);
          } else {
            toast.error(msg);
          }
          return;
        }
      } else {
        removeProfile();
        const msg = "Session expired, please log in again.";
        if (setError) {
          setError(msg);
        } else {
          toast.error(msg);
        }
        return;
      }
    }
  
    const message = extractErrorMessage(error, fallbackMessage);
    if (setError) {
      setError(message);
    } else {
      toast.error(message);
    }
  }, [removeProfile, refreshAccessToken]);

  return { handleError };
};