import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Link } from "wouter";
import {
  Grid,
  List,
  Search,
  ChevronLeft,
  ChevronRight,
  Home,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast"; // 1. IMPORT TOAST
import PropertyCard from "./PropertyCard";
import ListViewCard from "./ListViewCard";
import PropertyFilters from "./PropertyFilters";
import FormProperties from "./FormProperties";
import { EnhancedRoleBasedNavbar } from "../layout/EnhancedRoleBasedNavbar";

const baseUrl = `${import.meta.env.VITE_BASE_URL}`;

const convertByteArrayToImageUrl = (byteArray) => {
  if (!byteArray || byteArray.length === 0) {
    console.warn("Empty or null byte array provided");
    return "/placeholder.jpg";
  }

  try {
    let uint8Array;

    if (byteArray instanceof Uint8Array) {
      uint8Array = byteArray;
    } else if (Array.isArray(byteArray)) {
      uint8Array = new Uint8Array(byteArray);
    } else if (typeof byteArray === "string") {
      try {
        const base64Data = byteArray.includes(",")
          ? byteArray.split(",")[1]
          : byteArray;
        const binaryString = atob(base64Data);
        uint8Array = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          uint8Array[i] = binaryString.charCodeAt(i);
        }
      } catch (e) {
        console.error("Failed to decode base64 string:", e);
        return "/placeholder.jpg";
      }
    } else {
      console.error("Unsupported byte array format:", typeof byteArray);
      return "/placeholder.jpg";
    }

    let mimeType = "image/jpeg";

    if (uint8Array.length > 4) {
      const signature = Array.from(uint8Array.slice(0, 4))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (signature.startsWith("8950")) mimeType = "image/png";
      else if (signature.startsWith("4749")) mimeType = "image/gif";
      else if (signature.startsWith("ffd8")) mimeType = "image/jpeg";
      else if (signature.startsWith("5249")) mimeType = "image/webp";
    }

    const blob = new Blob([uint8Array], { type: mimeType });
    const url = URL.createObjectURL(blob);

    return url;
  } catch (error) {
    console.error("Error converting byte array to image:", error);
    return "/placeholder.jpg";
  }
};

const convertMediaMapToUrls = (mediaMap) => {
  if (!mediaMap || typeof mediaMap !== "object") {
    return [];
  }

  const urls = [];

  const mainImages = mediaMap["PROPERTY_MEDIA_MAIN"];
  if (mainImages && Array.isArray(mainImages) && mainImages.length > 0) {
    urls.push(convertByteArrayToImageUrl(mainImages[0]));
  }

  const otherImages = mediaMap["PROPERTY_MEDIA_OTHERS"];
  if (otherImages && Array.isArray(otherImages)) {
    otherImages.forEach((img) => {
      urls.push(convertByteArrayToImageUrl(img));
    });
  }

  if (urls.length === 0) {
    Object.values(mediaMap).forEach((imageList) => {
      if (Array.isArray(imageList)) {
        imageList.forEach((img) => {
          urls.push(convertByteArrayToImageUrl(img));
        });
      }
    });
  }

  if (urls.length === 0) {
    urls.push("/placeholder.jpg");
  }

  return urls.filter((url, index) => url !== "/placeholder.jpg" || index === 0);
};

const savePropertyToList = (newProperty) => {
  const existingProperties = JSON.parse(
    localStorage.getItem("userProperties") || "[]"
  );
  const updatedProperties = [...existingProperties, newProperty];
  localStorage.setItem("userProperties", JSON.stringify(updatedProperties));
  localStorage.setItem("currentPropertyId", newProperty.propertyId);
  localStorage.setItem("currentProperty", JSON.stringify(newProperty));
};

const handleAddProperty = async (propertyData) => {
  const response = await addProperty(propertyData);
  if (response && response.propertyId) {
    savePropertyToList(response);
  }
};

const getAuthTokens = () => {
  // 1. Get the user data string from local storage
  const authUserString = localStorage.getItem("auth_user");

  // 2. Parse it into an object (or null if it doesn't exist)
  const userData = authUserString ? JSON.parse(authUserString) : null;

  // 3. Get the userId *from* the parsed userData object
  const userId = userData ? userData.userId : null;

  console.log("Retrieved userId from userData object:", userId); // This will now show the ID

  return {
    token: localStorage.getItem("auth_token"),
    userId: userId, // <--- FIXED
    refreshToken: localStorage.getItem("auth_refresh_token"),
    userData: userData,
  };
};

const clearAuthTokens = () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_refresh_token");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("userId");
};

const api = axios.create({
  baseURL: baseUrl,
  timeout: 1000000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const { token } = getAuthTokens();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const { token, refreshToken } = getAuthTokens();
    if (error.response?.status === 401 && !originalRequest._retry && token) {
      originalRequest._retry = true;

      try {
        if (refreshToken) {
          const response = await axios.post(`${baseUrl}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          localStorage.setItem("auth_token", response.data.access_token);
          localStorage.setItem(
            "auth_refresh_token",
            response.data.refresh_token
          );

          originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
      }

      clearAuthTokens();
      window.location.href = "/auth";
    }

    return Promise.reject(error);
  }
);

const Properties = () => {
  const { userData: user } = getAuthTokens();

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    minPrice: "",
    maxPrice: "",
    pincode: "",
    location: "",
    city: "",
    state: "",
    furnishing: "",
    category: "",
  });
  const [allProperties, setAllProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(false);
  const [error, setError] = useState(null);
  const [showAuthRedirect, setShowAuthRedirect] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [propertiesPerPage] = useState(6);

  const getPaginatedProperties = () => {
    const startIndex = (currentPage - 1) * propertiesPerPage;
    const endIndex = startIndex + propertiesPerPage;
    return filteredProperties.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(filteredProperties.length / propertiesPerPage);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  const Pagination = () => {
    const totalPages = getTotalPages();
    const startItem = (currentPage - 1) * propertiesPerPage + 1;
    const endItem = Math.min(
      currentPage * propertiesPerPage,
      filteredProperties.length
    );

    if (totalPages <= 1) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200">
        <div className="text-gray-600 text-sm">
          Showing {startItem}-{endItem} of {filteredProperties.length}{" "}
          properties
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg transition-all duration-300 ${
              currentPage === 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNumber) => {
                const shouldShow =
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  Math.abs(pageNumber - currentPage) <= 1;

                const shouldShowEllipsis =
                  (pageNumber === 2 && currentPage > 4) ||
                  (pageNumber === totalPages - 1 &&
                    currentPage < totalPages - 3);

                if (!shouldShow && !shouldShowEllipsis) return null;

                if (shouldShowEllipsis) {
                  return (
                    <span key={pageNumber} className="px-2 py-1 text-gray-500">
                      ...
                    </span>
                  );
                }

                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`px-3 py-2 rounded-lg transition-all duration-300 text-sm font-medium ${
                      currentPage === pageNumber
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              }
            )}
          </div>

          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg transition-all duration-300 ${
              currentPage === totalPages
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const checkAuth = (showError = true) => {
    const { token, userId, userData } = getAuthTokens();

    if (!token) {
      if (showError) setShowAuthRedirect(true);
      return false;
    }

    if (!userId || !userData?.userId) {
      if (showError) setShowAuthRedirect(true);
      return false;
    }

    return true;
  };

  const fetchIndividualProperty = async (propertyId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get(
        `${baseUrl}/properties/getIndividualProperty?propertyId=${propertyId}`
      );
      console.log("Individual Property Response:", response.data);

      if (response.data) {
        const transformedProperty = {
          id: response.data.propertyId,
          propertyId: response.data.propertyId,
          property: {
            title: response.data.title,
            type: response.data.type,
            constructionStatus: response.data.constructionStatus,
            propertyStatus: response.data.status,
            location: response.data.location,
            actualPrice: response.data.actualPrice,
            discountPrice: response.data.discountPrice,
            price: response.data.actualPrice,
            description: response.data.description,
            bedrooms: response.data.bedrooms,
            bathrooms: response.data.bathrooms,
            squareFeet: response.data.areaSqft,
            furnishing: response.data.furnishing,
            amenities: response.data.amenities,
            propertyFeatures: response.data.propertyFeatures,
          },
          files: convertMediaMapToUrls(response.data.mediaFiles),
        };

        localStorage.setItem(
          "currentProperty",
          JSON.stringify(transformedProperty)
        );

        return transformedProperty;
      } else {
        throw new Error("Property not found");
      }
    } catch (err) {
      console.error("Fetch individual property error:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch property details"
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getIndividualProperty = async (propertyId = null) => {
    const targetPropertyId =
      propertyId || localStorage.getItem("currentPropertyId");

    if (!targetPropertyId) {
      setError("No property ID found");
      return null;
    }

    const storedProperty = localStorage.getItem("currentProperty");
    if (storedProperty) {
      try {
        const parsedProperty = JSON.parse(storedProperty);
        if (parsedProperty.propertyId === targetPropertyId) {
          return parsedProperty;
        }
      } catch (e) {
        console.error("Error parsing stored property:", e);
      }
    }

    return await fetchIndividualProperty(targetPropertyId);
  };

  const fetchAllProperties = async (pincode = "") => {
    setIsLoading(true);
    setError(null);

    try {
      const { userId } = getAuthTokens();
      const url = `/properties/byOwner/${userId}`;

      const res = await api.get(url);
      console.log("API Response:", res.data);

      if (res.data && Array.isArray(res.data)) {
        const transformedProperties = res.data.map((item) => ({
          id: item.propertyId,
          propertyId: item.propertyId,
          property: {
            title: item.title,
            type: item.type,
            constructionStatus: item.constructionStatus,
            propertyStatus: item.propertyStatus,
            location: item.location,
            actualPrice: item.actualPrice,
            discountPrice: item.discountPrice,
            price: item.actualPrice,
          },
          files: convertMediaMapToUrls(item.images),
        }));

        setAllProperties(transformedProperties);
      } else {
        throw new Error("Invalid data format received");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const addProperty = async (newProperty) => {
    if (!checkAuth()) {
      setShowAuthRedirect(true);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { userId, userData } = getAuthTokens();
      const ownerId = userId || userData?.userId;

      if (!ownerId) throw new Error("Authentication required");

      const propertyData = newProperty.property;

      const transformedProperty = {
        ...propertyData,
        ownerId: ownerId,
        actualPrice: parseFloat(propertyData.actualPrice) || 0,
        discountPrice: parseFloat(propertyData.discountPrice) || 0,
        bedrooms: parseInt(propertyData.bedrooms, 10) || 0,
        bathrooms: parseInt(propertyData.bathrooms, 10) || 0,
        areaSqft: parseInt(propertyData.areaSqft, 10) || 0,
        location: {
          addressLine1: propertyData.location?.addressLine1 || "",
          addressLine2: propertyData.location?.addressLine2 || "",
          city: propertyData.location?.city || "",
          country: propertyData.location?.country || "",
          pincode: propertyData.location?.pincode || "",
          state: propertyData.location?.state || "",
        },
        amenities: Array.isArray(propertyData.amenities)
          ? propertyData.amenities
          : [],
        propertyFeatures: Array.isArray(propertyData.propertyFeatures)
          ? propertyData.propertyFeatures
          : [],
      };

      const formData = new FormData();
      formData.append(
        "property",
        new Blob([JSON.stringify(transformedProperty)], {
          type: "application/json",
        })
      );

      if (newProperty.coverImage) {
        formData.append("coverImage", newProperty.coverImage); // <-- *** CHANGED ***
      } else {
        throw new Error("Cover image is required");
      }

      if (newProperty.otherImages && newProperty.otherImages.length > 0) {
        newProperty.otherImages.forEach((file) => {
          formData.append("otherImages", file); // <-- *** CHANGED ***
        });
      }

      const res = await api.post("/properties/add", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      let propertyId = null;
      let responseData = null;

      if (res.data) {
        if (res.data.propertyId) {
          propertyId = res.data.propertyId;
          responseData = res.data;
        } else if (res.data.data?.propertyId) {
          propertyId = res.data.data.propertyId;
          responseData = res.data.data;
        } else if (res.data.property?.propertyId) {
          propertyId = res.data.property.propertyId;
          responseData = res.data.property;
        } else if (res.data.id) {
          propertyId = res.data.id;
          responseData = res.data;
        } else if (typeof res.data === "string") {
          // Check if the response is the string "Property added successfully"
          // and try to fetch all properties again as a fallback.
          // This part is tricky if the controller *only* returns a string.
          // Ideally, the controller should return the ID or the created object.
          // For now, we assume the string might be the ID or a success message.
          // Let's check if it's NOT the success message, then treat it as an ID.
          if (res.data !== "Property added successfully") {
            propertyId = res.data;
            responseData = { propertyId: res.data };
          } else {
            // This is the case where the backend returns "Property added successfully"
            // but no ID. We can't get the ID directly.
            // We will just refetch all properties.
            console.log("Property added, but no ID returned. Refetching all.");
            await fetchAllProperties(filters.pincode);
            toast.success("Property added successfully!"); // <-- ADDED
            return res.data; // Return the success message
          }
        }
      }

      if (propertyId) {
        localStorage.setItem("currentPropertyId", propertyId);

        await fetchIndividualProperty(propertyId);
        console.log("Property saved. Fetched new details for ID:", propertyId);

        await fetchAllProperties(filters.pincode);
        toast.success("Property added successfully!"); // <-- ADDED
        return responseData;
      } else {
        // This handles the case where the response was "Property added successfully"
        // or any other structure that didn't yield an ID.
        if (res.data === "Property added successfully") {
          await fetchAllProperties(filters.pincode);
          toast.success("Property added successfully!"); // <-- ADDED
          return res.data;
        }

        console.error(
          "No propertyId found in response. Response structure:",
          res.data
        );
        throw new Error(
          `Property added but no ID returned. Response: ${JSON.stringify(
            res.data
          )}`
        );
      }
    } catch (err) {
      console.error("Add property error:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to add property"
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    // 1. Get ownerId
    const { userId, userData } = getAuthTokens();
    const ownerId = userId || userData?.userId;

    if (!ownerId) {
      toast.error("You must be logged in to delete a property.");
      return;
    }

    // 2. Define the actual delete logic as a promise
    const deletePromise = async () => {
      try {
        // Call the delete API
        await api.delete(
          `/properties/delete?propertyId=${propertyId}&ownerId=${ownerId}`
        );

        // Update the state locally to remove the card
        setAllProperties((prevProperties) =>
          prevProperties.filter((p) => p.propertyId !== propertyId)
        );
      } catch (err) {
        // If the promise rejects, this message will be shown
        console.error("Delete property error:", err);
        throw new Error(
          err.response?.data?.message ||
            err.message ||
            "Failed to delete property."
        );
      }
    };

    // 3. Show a custom confirmation toast
    toast(
      (t) => (
        <div className="flex flex-col gap-4 p-2">
          <p className="font-semibold text-gray-800">
            Are you sure you want to delete this property?
          </p>
          <p className="text-sm text-gray-600">This action cannot be undone.</p>
          <div className="flex gap-3">
            <button
              className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
              onClick={() => {
                // When "Delete" is clicked:
                // 1. Dismiss this confirmation toast
                toast.dismiss(t.id);
                // 2. Call the deletePromise and show its progress
                toast.promise(deletePromise(), {
                  loading: "Deleting property...",
                  success: <b>Property deleted successfully!</b>,
                  error: (err) => <b>{err.toString()}</b>, // Show the error from the promise
                });
              }}
            >
              Delete
            </button>
            <button
              className="flex-1 px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition-colors"
              onClick={() => toast.dismiss(t.id)} // Just dismiss the toast
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity, // Keep the toast open until a button is clicked
      }
    );
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const filteredProperties = allProperties.filter((item) => {
    if (!item.property) return false;

    const searchMatch =
      !searchTerm ||
      item.property.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.property.location?.city
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const pincodeMatch =
      !filters.pincode || item.property.location?.pincode === filters.pincode;

    const bedroomMatch =
      !filters.bedrooms ||
      (() => {
        const selectedBedrooms = filters.bedrooms;
        const propertyBedrooms = parseInt(item.property.bedrooms);

        if (selectedBedrooms === "4") {
          const result = propertyBedrooms >= 4;
          return result;
        } else {
          const result = propertyBedrooms === parseInt(selectedBedrooms);
          return result;
        }
      })();

    const typeMatch = !filters.type || item.property.type === filters.type;

    const priceMatch =
      (!filters.minPrice ||
        item.property.actualPrice >= parseFloat(filters.minPrice)) &&
      (!filters.maxPrice ||
        item.property.actualPrice <= parseFloat(filters.maxPrice));

    const cityMatch =
      !filters.city ||
      item.property.location?.city
        ?.toLowerCase()
        .includes(filters.city.toLowerCase());

    const stateMatch =
      !filters.state ||
      item.property.location?.state
        ?.toLowerCase()
        .includes(filters.state.toLowerCase());

    const finalResult =
      searchMatch &&
      bedroomMatch &&
      typeMatch &&
      priceMatch &&
      pincodeMatch &&
      cityMatch &&
      stateMatch;

    return finalResult;
  });

  useEffect(() => {
    fetchAllProperties();
  }, []);

  useEffect(() => {
    if (filters.pincode) {
      fetchAllProperties(filters.pincode);
    }
  }, [filters.pincode]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white text-gray-800 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-800 pt-[100px] bg-white z-10">
      {/* 2. ADD THE <Toaster /> COMPONENT */}
      <Toaster position="top-center" reverseOrder={false} />

      <EnhancedRoleBasedNavbar user={user} onLogout={logout} />
      <div className="border-b border-gray-200 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1
                className="
  text-3xl      /* mobile */
  sm:text-4xl    /* small screens */
  md:text-5xl    /* tablets */
  lg:text-6xl    /* laptops */
  xl:text-7xl    /* big screens */ 
  mb-3 
  text-gray
"
              >
                My Listed Properties
              </h1>

              <p className="text-gray-600 text-lg">Manage Your Properties</p>
            </div>
          </div>

          {showAuthRedirect && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6 text-center">
              <p className="text-yellow-800">Please login to add properties</p>
              <Link href="/auth">
                <a className="mt-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors block">
                  Go to Login
                </a>
              </Link>
            </div>
          )}

          <FormProperties onAddProperty={addProperty} />
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-300 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center mt-0.5">
                <span className="text-white text-sm font-bold">!</span>
              </div>
              <div className="flex-1">
                <h3 className="text-red-800 font-semibold mb-2">
                  Something went wrong
                </h3>
                <div className="text-red-700 text-sm mb-4 space-y-2">
                  <p>
                    <strong>Error:</strong> {error}
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer hover:text-red-600">
                      Technical Details
                    </summary>
                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
                      <p>This usually happens when:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>The server returns data in an unexpected format</li>
                        <li>
                          The property was created but the response format
                          changed
                        </li>
                        <li>Network issues during the request</li>
                      </ul>
                    </div>
                  </details>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setError(null);
                      fetchAllProperties(filters.pincode);
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-sm"
                  >
                    Refresh Properties
                  </button>
                  <button
                    onClick={() => setError(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                  >
                    Dismiss Error
                  </button>
                  <button
                    onClick={() => {
                      fetchAllProperties(filters.pincode);
                      setError(null);
                    }}
                    className="px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors text-sm"
                  >
                    Check if Property was Added
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!error && (
        <div className="border-b border-gray-200 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-100 backdrop-blur-md border border-gray-300 rounded-2xl pl-12 pr-6 py-3 text-gray-800 placeholder-gray-500 w-80 focus:outline-none focus:border-blue-600 focus:bg-white transition-all duration-300"
                />
              </div>
              <PropertyFilters
                filters={filters}
                onFilterChange={handleFilterChange}
              />
            </div>
            <div className="flex items-center justify-between">
              {/* Button group removed as requested */}
              <div></div>

              <div className="text-gray-600 text-sm">
                {filteredProperties.length}{" "}
                {filteredProperties.length === 1 ? "property" : "properties"}{" "}
                found
              </div>
            </div>
          </div>
        </div>
      )}

      {!error && (
        <div className="relative max-w-7xl mx-auto px-4 py-12">
          {viewMode === "list" ? (
            <div className="space-y-6">
              {getPaginatedProperties().map((item) => (
                <Link
                  key={item.propertyId}
                  href={`/properties/${item.propertyId}`}
                  onClick={() => {
                    localStorage.setItem("currentPropertyId", item.propertyId);
                    localStorage.setItem(
                      "currentProperty",
                      JSON.stringify(item)
                    );
                  }}
                >
                  <a>
                    <ListViewCard
                      property={item.property}
                      files={item.files}
                      ownerName={item.ownerName || "Owner"}
                      // Note: You will need to add delete functionality to ListViewCard as well
                    />
                  </a>
                </Link>
              ))}

              <Pagination />
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {getPaginatedProperties().map((item) => (
                  <Link
                    key={item.propertyId}
                    href={`/properties/${item.propertyId}`}
                    onClick={() => {
                      localStorage.setItem(
                        "currentPropertyId",
                        item.propertyId
                      );
                      localStorage.setItem(
                        "currentProperty",
                        JSON.stringify(item)
                      );
                    }}
                  >
                    <a className="block">
                      <PropertyCard
                        property={item.property}
                        files={item.files}
                        ownerName={item.ownerName || "Owner"}
                        isSlider={false}
                        onDelete={() => handleDeleteProperty(item.propertyId)}
                      />
                    </a>
                  </Link>
                ))}
              </div>

              <Pagination />
            </div>
          )}

          {filteredProperties.length === 0 && (
            <div className="text-center py-16">
              <Home className="w-20 h-20 mx-auto mb-6 text-gray-400" />
              <p className="text-2xl mb-2 text-gray-700">No properties found</p>
              <p className="text-gray-500">
                Try adjusting your search criteria
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Properties;
