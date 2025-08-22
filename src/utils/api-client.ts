import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { HubSpotConfig, ApiError } from '../types/config';
import { AuthManager, AuthError } from './auth';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public correlationId?: string,
    public category?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class ApiClient {
  private config: HubSpotConfig;
  private authManager: AuthManager;
  private axiosInstance: AxiosInstance;

  constructor(config: HubSpotConfig, authManager: AuthManager) {
    this.config = config;
    this.authManager = authManager;
    
    // Create axios instance with base configuration
    this.axiosInstance = axios.create({
      baseURL: config.apiBaseUrl,
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor to add authentication
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await this.authManager.getAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Try to refresh token once
          try {
            await this.authManager.refreshToken();
            // Retry the original request
            const originalRequest = error.config;
            if (originalRequest) {
              const token = await this.authManager.getAccessToken();
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            // If refresh fails, throw the original error
            throw this.createApiError(error);
          }
        }
        throw this.createApiError(error);
      }
    );
  }

  /**
   * Create a standardized API error from an axios error
   */
  private createApiError(error: AxiosError): ApiClientError {
    const errorData = error.response?.data as ApiError;
    
    if (errorData && typeof errorData === 'object') {
      return new ApiClientError(
        `API Error: ${errorData.message || 'Unknown error'}`,
        error.response?.status,
        errorData.correlationId,
        errorData.category
      );
    }
    
    return new ApiClientError(
      `HTTP Error: ${error.message}`,
      error.response?.status
    );
  }

  /**
   * Make a GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig & { suppressErrorLogging?: boolean }): Promise<T> {
    try {
      const response = await this.axiosInstance.get<T>(url, config);
      
      // Handle 204 No Content responses specially
      if (response.status === 204) {
        throw new ApiClientError('No content available', 204);
      }
      
      return response.data;
    } catch (error) {
      const suppressLogging = config?.suppressErrorLogging;
      
      // Check if this is a 204 error and we should suppress logging
      const is204Error =  (error as any)?.response?.status === 204 ||
                          (error instanceof ApiClientError &&  error.statusCode === 204);
      
      if (this.config.debug && !(suppressLogging && is204Error)) {
        console.error('GET request failed:', error);
      }
      
      throw error;
    }
  }

  /**
   * Make a POST request
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      if (this.config.debug) {
        console.error('POST request failed:', error);
      }
      throw error;
    }
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.delete<T>(url, config);
      return response.data;
    } catch (error) {
      if (this.config.debug) {
        console.error('DELETE request failed:', error);
      }
      throw error;
    }
  }

  /**
   * Make a PUT request
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      if (this.config.debug) {
        console.error('PUT request failed:', error);
      }
      throw error;
    }
  }
} 