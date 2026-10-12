// src/api/useFetchObject.js
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config/env";

const useFetchObject = (queryKey, endpoint, id, token) => {
  const fetchFunction = async () => {
    const headers = token ? { Authorization: `Token ${token}` } : {};
    
    // Build the endpoint URL
    let finalEndpoint = endpoint;
    
    // If endpoint doesn't include the id, add it
    if (!finalEndpoint.includes(id)) {
      // Ensure endpoint doesn't end with a slash
      finalEndpoint = finalEndpoint.endsWith('/') ? finalEndpoint.slice(0, -1) : finalEndpoint;
      // Add id - ensure it has a trailing slash for Django's URL patterns
      finalEndpoint = `${finalEndpoint}/${id}/`;
    }
    
    console.log("Fetching single object from:", `${API_BASE_URL}/${finalEndpoint}`);
    
    const response = await axios.get(
      `${API_BASE_URL}/${finalEndpoint}`,
      {
        headers,
      }
    );
    return response.data;
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: fetchFunction,
    enabled: Boolean(id && token),
  });

  return { data, isLoading, isError, error, refetch };
};

export default useFetchObject;
