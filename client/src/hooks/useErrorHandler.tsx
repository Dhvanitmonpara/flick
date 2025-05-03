import { env } from "@/conf/env";
import useProfileStore from "@/store/profileStore";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";

let isRefreshing = false;

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
    } finally {
      // Always reset the flag when refresh completes or fails
      isRefreshing = false;
    }
  };

  // 2) Pull a human‑friendly message out of any Error/AxiosError
  const extractErrorMessage = (
    error: AxiosError | Error,
    fallback: string
  ) => {
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
    fallbackMessage: string
  ): Promise<void> => {
    // Only axios 401s can trigger refresh
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const canRefresh = !!error.response.data?.hasRefreshToken;

      if (canRefresh && !isRefreshing) {
        // Set flag to prevent multiple refreshes
        isRefreshing = true;
        
        try {
          await refreshAccessToken();
          toast.success("Session refreshed successfully");
          return;
        } catch (refreshError) {
          // Refresh itself failed → logout
          removeProfile();
          const msg = extractErrorMessage(
            refreshError as AxiosError | Error,
            "Session expired, please log in again."
          );
          toast.error(msg);
          return;
        }
      } else {
        removeProfile();
        toast.error("Session expired, please log in again.");
        return;
      }
    }

    const message = extractErrorMessage(error, fallbackMessage);
    toast.error(message);
  };

  return { handleError };
};