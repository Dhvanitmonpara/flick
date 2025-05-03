import { env } from "@/conf/env";
import useProfileStore from "@/store/profileStore";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";

export const useErrorHandler = () => {
  const { setProfile, removeProfile } = useProfileStore();

  const refreshAccessToken = async () => {
    if (!env.serverApiEndpoint) {
      console.error("Missing VITE_SERVER_API_ENDPOINT env variable");
      throw new Error("Server API URL is not defined");
    }

    try {
      const { data } = await axios.post(`${env.serverApiEndpoint}/users/refresh`, {}, { withCredentials: true });
      setProfile(data);
    } catch (error) {
      console.error("Failed to refresh access token:", error);
      removeProfile();
      throw error;
    }
  };

  const extractErrorMessage = (error: AxiosError | Error, fallback: string) => {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.message || error.response?.data?.error || error.message || fallback;
    }
    return (error as Error).message || fallback;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleError = async (error: AxiosError | Error, fallbackMessage: string, originalRequest?: (data?: any) => Promise<void>, isRetry = false) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 && error.response?.data?.hasRefreshToken) {
        if (!isRetry) {
          try {
            await refreshAccessToken();
            if (originalRequest) {
              return await originalRequest();
            }
            return;
          } catch (refreshError) {
            console.error("Token refresh failed", refreshError);
          }
        }
      }
    }
    const message = extractErrorMessage(error, fallbackMessage);
    toast.error(message);
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      removeProfile();
    }
  };

  return { handleError };
};
