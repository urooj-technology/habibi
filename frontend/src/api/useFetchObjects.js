// src/api/useFetchObjects.js
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config/env";

const useFetchObjects = (queryKey, endpoint, token) => {
  const fetchFunction = async () => {
    const headers = token ? { Authorization: `Token ${token}` } : {};
    
    // Convert endpoint from object to query string if it's an object
    let finalEndpoint = endpoint;
    if (typeof endpoint === 'object') {
      // Extract the base endpoint (the path without parameters)
      const baseEndpoint = queryKey;
      
      // Create URLSearchParams from the endpoint object
      const params = new URLSearchParams();
      Object.entries(endpoint).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      
      // Combine base endpoint with query parameters
      const queryString = params.toString();
      finalEndpoint = `${baseEndpoint}${queryString ? `?${queryString}` : ''}`;
    }
    
    console.log("Fetching from:", `${API_BASE_URL}/${finalEndpoint}`);
    
    const response = await axios.get(
      `${API_BASE_URL}/${finalEndpoint}`,
      { headers }
    );
    return response.data;
  };

  const { data, isLoading, isError, isSuccess, error, refetch, isFetching } =
    useQuery({
      queryKey,
      queryFn: fetchFunction,
      enabled: Boolean(endpoint && token),
    });

  return { data, isLoading, isError, isSuccess, error, refetch, isFetching };
};

export default useFetchObjects;
