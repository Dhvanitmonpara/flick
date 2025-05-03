/* eslint-disable @typescript-eslint/no-explicit-any */
import { env } from "@/conf/env";
import useProfileStore from "@/store/profileStore";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";

let globalRefreshPromise: Promise<any> | null = null;

export const useErrorHandler = () => {
  const { setProfile, removeProfile } = useProfileStore();

  // 1) Refresh endpoint
  const refreshAccessToken = async () => {
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
  };

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
  
  const handleError = async (
    error: AxiosError | Error,
    fallbackMessage: string,
    originalReq?: () => Promise<any>,
    hasRetried = false
  ): Promise<any> => {
    // Only axios 401s can trigger refresh
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Check if we should try to refresh the token
      const shouldRefresh = error.response.data?.error === "Unauthorized" && !hasRetried;

      if (shouldRefresh) {
        try {
          // If there's already a refresh in progress, wait for it instead of starting a new one
          if (!globalRefreshPromise) {
            globalRefreshPromise = refreshAccessToken().finally(() => {
              globalRefreshPromise = null; // Clear the promise when done
            });
          }
          
          // Wait for the refresh to complete
          await globalRefreshPromise;
          
          // If we have an original request function, retry it
          if (originalReq) {
            try {
              return await originalReq();
            } catch (retryError) {
              // If the retry fails after a token refresh, handle it as a new error
              // but with hasRetried=true to prevent infinite loops
              return handleError(
                retryError as AxiosError | Error, 
                fallbackMessage, 
                undefined, // No further retries
                true // Mark as retried
              );
            }
          }
          return;
        } catch (refreshError) {
          // Refresh itself failed → show error (removeProfile already called in refreshAccessToken)
          const msg = extractErrorMessage(
            refreshError as AxiosError | Error,
            "Session expired, please log in again."
          );
          toast.error(msg);
          return;
        }
      } else {
        // Either unauthorized without the right condition or already retried → logout
        removeProfile();
        toast.error("Session expired, please log in again.");
        return;
      }
    }

    // Any other error: just show it
    const message = extractErrorMessage(error, fallbackMessage);
    toast.error(message);
  };

  return { handleError };
};