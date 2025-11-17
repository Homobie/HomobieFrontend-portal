import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  MapPin,
  Bed,
  Bath,
  Ruler,
  Car,
  X,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Heart,
  Share2,
  Calendar,
  Shield,
  Eye,
} from "lucide-react";
import { useRoute } from "wouter";
import { EnhancedRoleBasedNavbar } from "../layout/EnhancedRoleBasedNavbar";

// API Configuration
const BASE_URL = `${import.meta.env.VITE_BASE_URL}`;

// Debug function to analyze image data
const debugImageData = (imageData, index = 0) => {
  console.log(`=== DEBUG Image ${index} ===`);
  console.log("Type:", typeof imageData);

  if (typeof imageData === "string") {
    console.log("Length:", imageData.length);
    console.log("First 100 chars:", imageData.substring(0, 100));

    // Check for the specific malformed pattern from your backend
    if (imageData.includes("image/jpeg/poses")) {
      console.log('Detected malformed JPEG data URL with "poses"');
    } else if (imageData.startsWith("/9j/")) {
      console.log("Detected: JPEG base64 data (without prefix)");
    } else if (imageData.startsWith("iVBORw")) {
      console.log("Detected: PNG base64 data (without prefix)");
    } else if (imageData.startsWith("data:image/")) {
      console.log("Detected: Data URL");
    } else if (imageData.startsWith("http")) {
      console.log("Detected: HTTP URL");
    } else {
      console.log("Unknown format - assuming base64 without prefix");
    }
  }

  console.log(`=== END DEBUG Image ${index} ===`);
};

// Corrected image conversion function
const convertImageDataToUrl = (imageData) => {
  if (!imageData) {
    console.warn("No image data provided");
    return null;
  }

  try {
    // If it's already a proper URL, return it
    if (
      typeof imageData === "string" &&
      (imageData.startsWith("http") ||
        imageData.startsWith("blob:") ||
        imageData.startsWith("data:image/"))
    ) {
      // Fix malformed data URLs from your backend
      if (imageData.includes("image/jpeg/poses")) {
        const base64Data = imageData.split("image/jpeg/poses/")[1];
        return `data:image/jpeg;base64,${base64Data}`;
      }
      return imageData;
    }

    // If it's a base64 string without prefix, add the proper prefix
    if (typeof imageData === "string") {
      // Check if it looks like base64 data
      if (imageData.match(/^[A-Za-z0-9+/=]+$/)) {
        return `data:image/jpeg;base64,${imageData}`;
      }

      // Handle the specific malformed pattern from your backend
      if (imageData.includes("image/jpeg/poses")) {
        const base64Data = imageData.split("image/jpeg/poses/")[1];
        return `data:image/jpeg;base64,${base64Data}`;
      }
    }

    // Handle byte arrays reliably using Blob
    if (imageData instanceof Uint8Array || Array.isArray(imageData)) {
      const bytes =
        imageData instanceof Uint8Array ? imageData : new Uint8Array(imageData);

      if (bytes.length === 0) {
        console.warn("Byte array is empty.");
        return null;
      }

      // Simple MIME type detection
      let mimeType = "image/jpeg"; // Default
      if (bytes.length > 4) {
        const signature = Array.from(bytes.slice(0, 4))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        if (signature.startsWith("8950")) mimeType = "image/png";
        else if (signature.startsWith("4749")) mimeType = "image/gif";
        else if (signature.startsWith("ffd8")) mimeType = "image/jpeg";
      }

      const blob = new Blob([bytes], { type: mimeType });
      // Create a local URL for the blob
      return URL.createObjectURL(blob);
    }

    console.warn("Unsupported image data format:", typeof imageData, imageData);
    return null;
  } catch (error) {
    console.error("Error converting image data to URL:", error);
    return null;
  }
};

// Enhanced convertImageArrayToUrls with debugging
const convertImageArrayToUrls = (imageArray) => {
  if (!imageArray || !Array.isArray(imageArray)) {
    console.warn("Invalid or missing image array");
    return [];
  }

  const urls = [];

  for (let i = 0; i < imageArray.length; i++) {
    const imgData = imageArray[i];
    // debugImageData(imgData, i); // Optional: uncomment for deep debugging

    const url = convertImageDataToUrl(imgData);
    if (url) {
      urls.push(url);
      console.log(
        `Successfully converted image ${i}:`,
        url.substring(0, 50) + "..."
      );
    } else {
      console.warn(`Failed to convert image ${i}`);
    }
  }

  return urls;
};

// API function to fetch individual property
const fetchIndividualProperty = async (propertyId) => {
  try {
    console.log(`Fetching property: ${propertyId}`);

    const response = await fetch(
      `${BASE_URL}/properties/getIndividualProperty?propertyId=${propertyId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication failed. Please log in again.");
      }
      if (response.status === 404) {
        throw new Error("Property not found.");
      }
      throw new Error(
        `Failed to fetch property: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("Raw API Response:", data);

    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};

// Process property data and convert images
const processPropertyData = (rawData) => {
  if (!rawData) {
    console.warn("No property data to process");
    return null;
  }

  console.log("Processing property data:", rawData);

  // Convert images from various possible fields
  let imageUrls = [];

  // Check different possible image fields
  // This will check rawData.images, then rawData.mediaFiles, etc.
  const imageSources = [
    rawData.mediaFiles, // From IndividualPropertyDetailResponse
    rawData.images, // From PropertyListResponse (if that's what's passed)
    rawData.imageUrls, // if already processed
  ];

  for (const source of imageSources) {
    if (!source) continue;

    // Handle the Map/Object structure from your DTO
    // e.g., { "PROPERTY_MEDIA_MAIN": [...], "PROPERTY_MEDIA_OTHERS": [...] }
    if (typeof source === "object" && !Array.isArray(source)) {
      console.log("Found images as an object/map. Extracting...");
      const allImageByteArrays = [];

      // Prioritize known keys
      if (Array.isArray(source["PROPERTY_MEDIA_MAIN"])) {
        allImageByteArrays.push(...source["PROPERTY_MEDIA_MAIN"]);
      }
      if (Array.isArray(source["PROPERTY_MEDIA_OTHERS"])) {
        allImageByteArrays.push(...source["PROPERTY_MEDIA_OTHERS"]);
      }

      // If no known keys found, just grab all valid arrays from the object's values
      if (allImageByteArrays.length === 0) {
        Object.values(source).forEach((list) => {
          if (Array.isArray(list)) {
            allImageByteArrays.push(...list);
          }
        });
      }

      // If we found any images, convert them
      if (allImageByteArrays.length > 0) {
        imageUrls = convertImageArrayToUrls(allImageByteArrays);
        if (imageUrls.length > 0) break; // Stop after finding and processing images
      }
    }

    // Fallback: Handle if it's already an array (e.g., rawData.imageUrls)
    else if (Array.isArray(source) && source.length > 0) {
      console.log("Found images as a plain array.");
      imageUrls = convertImageArrayToUrls(source);
      if (imageUrls.length > 0) break; // Stop after finding and processing images
    }
  }

  if (imageUrls.length === 0) {
    console.log("No images found in data, using placeholder");
    // Add a placeholder image
    imageUrls = [
      "https://via.placeholder.com/800x600/333/fff?text=No+Image+Available",
    ];
  }

  // Structure the property data
  const processedProperty = {
    // IDs
    id: rawData.propertyId || `temp-${Date.now()}`,
    propertyId: rawData.propertyId,

    // Core Details
    title: rawData.title || "Untitled Property",
    description: rawData.description || "No description available.",
    actualPrice: rawData.actualPrice || 0,
    discountPrice: rawData.discountPrice || 0,
    areaSqft: rawData.areaSqft || 0,
    bedrooms: rawData.bedrooms || 0,
    bathrooms: rawData.bathrooms || 0,

    // Categorization
    type: rawData.type || "N/A",
    category: rawData.category || "N/A",
    status: rawData.status || "N/A", // 'status' from IndividualPropertyDetailResponse
    furnishing: rawData.furnishing || "N/A",
    constructionStatus: rawData.constructionStatus || "N/A",

    // Location (from LocationResponse)
    location: {
      address: rawData.location?.addressLine1 || "",
      city: rawData.location?.city || "",
      state: rawData.location?.state || "",
      pincode: rawData.location?.pincode || "",
    },

    // PROCESSED IMAGES
    imageUrls: imageUrls,

    // Other arrays
    amenities: rawData.amenities || [],
    propertyFeatures: rawData.propertyFeatures || [],

    // Owner
    ownerName: rawData.ownerName || "Private Owner",
  };

  console.log(
    "Processed property with image URLs:",
    processedProperty.imageUrls
  );
  return processedProperty;
};

// Simple image component with onClick on all states
const PropertyImage = ({ src, alt, className, onClick, loading = "lazy" }) => {
  const [imageState, setImageState] = useState("loading");
  const [imgRef, setImgRef] = useState(null);

  useEffect(() => {
    if (!src) {
      setImageState("error");
      return;
    }

    // Reset state when src changes
    setImageState("loading");

    // Create a new image to test if it loads
    const img = new Image();

    img.onload = () => {
      console.log("Image loaded successfully:", src.substring(0, 50) + "...");
      setImageState("loaded");
    };

    img.onerror = (e) => {
      console.error("Failed to load image:", src.substring(0, 50) + "...", e);
      setImageState("error");
    };

    // Start loading the image
    img.src = src;
    setImgRef(img);

    // Cleanup
    return () => {
      if (img) {
        img.onload = null;
        img.onerror = null;
      }
    };
  }, [src]);

  // Show error state
  if (imageState === "error" || !src) {
    return (
      <div
        className={`${className} bg-gray-100 flex items-center justify-center text-gray-400`}
        onClick={onClick} // Click handler here
      >
        <div className="text-center">
          <div className="text-4xl mb-2">🖼️</div>
          <div className="text-sm">Image not available</div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (imageState === "loading") {
    return (
      <div
        className={`${className} bg-gray-100 flex items-center justify-center`}
        onClick={onClick} // Click handler here
      >
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  // Show loaded image
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onClick={onClick} // Click handler here
      loading={loading}
      onError={() => {
        console.error("Image failed to display:", src.substring(0, 50) + "...");
        setImageState("error");
      }}
    />
  );
};
const getAuthTokens = () => {
  const authUser = localStorage.getItem("auth_user");
  return {
    token: localStorage.getItem("auth_token"),
    userId: localStorage.getItem("userId"),
    refreshToken: localStorage.getItem("auth_refresh_token"),
    userData: authUser ? JSON.parse(authUser) : null,
  };
};

const PropertyDetail = () => {
  const { userData: user } = getAuthTokens();

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };
  const [match, params] = useRoute("/properties/:propertyId");
  const propertyIdFromUrl = params?.propertyId;

  const [property, setProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  // const [isFavorite, setIsFavorite] = useState(false);

  const goBack = () => {
    window.history.back();
  };

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      if (property?.imageUrls) {
        property.imageUrls.forEach((url) => {
          if (url && url.startsWith("blob:")) {
            URL.revokeObjectURL(url);
          }
        });
      }
    };
  }, [property]);

  useEffect(() => {
    const fetchPropertyDetail = async () => {
      const propertyId = propertyIdFromUrl;

      if (!propertyId) {
        setError(
          "Property ID not found in URL. Please select a property to view."
        );
        setIsLoading(false);
        return;
      }

      try {
        // STEP 1: Fetch raw data from API
        const rawPropertyData = await fetchIndividualProperty(propertyId);

        // STEP 2: Process data and convert images
        const processedProperty = processPropertyData(rawPropertyData);

        if (!processedProperty) {
          throw new Error("Failed to process property data");
        }

        // STEP 3: Set the processed data with image URLs
        setProperty(processedProperty);

        // Handle favorites
        try {
          const favorites = JSON.parse(
            sessionStorage.getItem("favorites") || "[]"
          );
          // Commented out to prevent crash
          // setIsFavorite(favorites.includes(propertyId));
        } catch {
          sessionStorage.setItem("favorites", "[]");
        }
      } catch (err) {
        console.error("Error fetching property:", err);
        setError(err.message || "Failed to load property details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPropertyDetail();
  }, [propertyIdFromUrl]);

  // Memoized calculations
  const discountPercentage = useMemo(() => {
    if (!property?.discountPrice || !property?.actualPrice) return 0;
    return Math.round(
      ((property.actualPrice - property.discountPrice) / property.actualPrice) *
        100
    );
  }, [property]);

  const pricePerSqft = useMemo(() => {
    if (!property?.discountPrice && !property?.actualPrice) return 0;
    const price = property.discountPrice || property.actualPrice;
    if (!property.areaSqft) return 0;
    return Math.round(price / property.areaSqft);
  }, [property]);

  const nextImage = () => {
    if (!property?.imageUrls || property.imageUrls.length === 0) return;
    setSelectedImageIndex((prev) =>
      prev === property.imageUrls.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    if (!property?.imageUrls || property.imageUrls.length === 0) return;
    setSelectedImageIndex((prev) =>
      prev === 0 ? property.imageUrls.length - 1 : prev - 1
    );
  };

  // const toggleFavorite = () => {
  //   setIsFavorite(!isFavorite);
  // };

  const shareProperty = async () => {
    const shareData = {
      title: property.title,
      text: `Check out this amazing property: ${property.title}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Property link copied to clipboard!");
      }
    } catch (err) {
      console.log("Error sharing:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen text-gray-900  flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-lg mt-4">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white border border-gray-200 rounded-lg p-8 shadow-lg">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={goBack}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-all duration-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!property?.title) {
    return (
      <div className="bg-gray-50 min-h-screen text-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🏠</div>
          <h2 className="text-2xl font-bold mb-4">Property Not Found</h2>
          <p className="text-gray-500 mb-6">
            The property you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={goBack}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-all"
          >
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen text-gray-900 pt-[80px]">
      <EnhancedRoleBasedNavbar user={user} onLogout={logout} />
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Back to Properties
            </button>
            <div className="flex items-center gap-3">
              {/* <button
                onClick={toggleFavorite}
                aria-label={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
                className={`p-2 rounded-lg transition-all duration-300 ${
                  isFavorite
                    ? "bg-red-500/10 text-red-500"
                    : "bg-gray-100 text-gray-500 hover:text-gray-900"
                }`}
              >
                <Heart
                  className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`}
                />
              </button> */}
              {/* <button
                onClick={shareProperty}
                aria-label="Share property"
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
              >
                <Share2 className="w-5 h-5" />
              </button> */}
            </div>
          </div>
        </div>
      </div>

      {/* Property Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Image Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {property.imageUrls && property.imageUrls.length > 0 ? (
            <>
              <div className="relative group">
                <PropertyImage
                  src={property.imageUrls[0]}
                  alt={property.title}
                  // RESPONSIVE FIX: Adjusted height for mobile
                  className="w-full h-64 sm:h-80 lg:h-96 object-cover rounded-xl cursor-pointer border border-gray-200"
                  onClick={() => {
                    setSelectedImageIndex(0);
                    setShowImageModal(true);
                  }}
                  loading="eager"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                  <div className="bg-black/50 px-3 py-1 rounded-lg text-sm text-white backdrop-blur-sm">
                    <Eye className="w-4 h-4 inline mr-1" />
                    View Gallery ({property.imageUrls.length} photos)
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {property.imageUrls.slice(1, 5).map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <PropertyImage
                      src={imageUrl}
                      alt={`${property.title} ${index + 2}`}
                      // RESPONSIVE FIX: Adjusted height for mobile
                      className="w-full h-32 sm:h-44 object-cover rounded-xl cursor-pointer border border-gray-200"
                      onClick={() => {
                        setSelectedImageIndex(index + 1);
                        setShowImageModal(true);
                      }}
                    />
                    {index === 3 && property.imageUrls.length > 5 && (
                      <div
                        className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center cursor-pointer"
                        onClick={() => {
                          setSelectedImageIndex(4);
                          setShowImageModal(true);
                        }}
                      >
                        <span className="text-white font-semibold">
                          +{property.imageUrls.length - 5} more
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="lg:col-span-2 h-96 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 border border-gray-200">
              <div className="text-center">
                <div className="text-6xl mb-4">📷</div>
                <p>No images available for this property</p>
              </div>
            </div>
          )}
        </div>

        {/* Property Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="flex items-start justify-between mb-4">
              {/* RESPONSIVE FIX: Smaller text on mobile */}
              <h1 className="text-3xl sm:text-4xl font-bold flex-1 text-gray-900">
                {property.title}
              </h1>
              {discountPercentage > 0 && (
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold ml-4">
                  {discountPercentage}% OFF
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 mb-6 text-gray-500">
              <MapPin className="w-5 h-5 flex-shrink-0" />
              <span>
                {property.location?.city}, {property.location?.state} -{" "}
                {property.location?.pincode}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-xl text-center border border-gray-200 shadow-sm">
                <Bed className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="text-sm font-medium text-gray-700">
                  {property.bedrooms} Bedrooms
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl text-center border border-gray-200 shadow-sm">
                <Bath className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium text-gray-700">
                  {property.bathrooms} Bathrooms
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl text-center border border-gray-200 shadow-sm">
                <Ruler className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <p className="text-sm font-medium text-gray-700">
                  {property.areaSqft} sq.ft.
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl text-center border border-gray-200 shadow-sm">
                <Car className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                <p className="text-sm font-medium text-gray-700">Parking</p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-900">
                Description
                <div className="h-0.5 bg-gradient-to-r from-gray-200 to-transparent flex-1"></div>
              </h2>
              <p className="text-gray-600 leading-relaxed text-lg">
                {property.description}
              </p>
            </div>

            {property.propertyFeatures &&
              property.propertyFeatures.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-900">
                    Property Features
                    <div className="h-0.5 bg-gradient-to-r from-gray-200 to-transparent flex-1"></div>
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {property.propertyFeatures.map((feature, index) => (
                      <div
                        key={index}
                        className="bg-white px-4 py-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors shadow-sm text-gray-700"
                      >
                        <span className="text-green-600 mr-2">✓</span>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {property.amenities && property.amenities.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-900">
                  Amenities
                  <div className="h-0.5 bg-gradient-to-r from-gray-200 to-transparent flex-1"></div>
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {property.amenities.map((amenity, index) => (
                    <div
                      key={index}
                      className="bg-white px-4 py-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors shadow-sm text-gray-700"
                    >
                      <span className="text-blue-600 mr-2">★</span>
                      {amenity}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* RESPONSIVE FIX: Sticky only on large screens */}
            <div className="bg-white border border-gray-200 shadow-xl rounded-2xl p-6 lg:sticky top-24">
              <div className="mb-6 text-center">
                <h3 className="text-lg font-medium mb-3 text-gray-500">
                  Price
                </h3>
                {property.discountPrice ? (
                  <div>
                    {/* RESPONSIVE FIX: Smaller text on mobile */}
                    <p className="text-3xl sm:text-4xl font-bold text-green-600 mb-1">
                      ₹{property.discountPrice.toLocaleString()}
                    </p>
                    <p className="text-gray-400 line-through text-lg">
                      ₹{property.actualPrice.toLocaleString()}
                    </p>
                    <p className="text-sm text-green-600 mt-2">
                      You save ₹
                      {(
                        property.actualPrice - property.discountPrice
                      ).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  // RESPONSIVE FIX: Smaller text on mobile
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900">
                    ₹{property.actualPrice.toLocaleString()}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  {pricePerSqft > 0
                    ? `₹${pricePerSqft.toLocaleString()} per sq.ft.`
                    : "Price on request"}
                </p>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold mb-3 text-gray-900">
                  Quick Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-500">Type:</span>
                    <span className="font-medium text-gray-800">
                      {property.type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-500">Category:</span>
                    <span className="font-medium text-gray-800">
                      {property.category}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-500">Status:</span>
                    <span className="font-medium text-green-600">
                      {property.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-500">Furnishing:</span>
                    <span className="font-medium text-gray-800">
                      {property.furnishing}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500">Construction:</span>
                    <span className="font-medium text-gray-800">
                      {property.constructionStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* <div className="mb-6">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-900">
                  <Shield className="w-5 h-5" />
                  Owner Information
                </h3>
                <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg">
                  <p className="font-medium text-gray-900 blur-sm select-none">
                    Ramesh Sharma
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Property Owner</p>
                </div>
              </div> */}

              {/* <div className="space-y-3">
                <a
                  href="tel:+917770867232"
                  className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all duration-300 flex items-center justify-center gap-2 group shadow-md"
                >
                  <Phone className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  Contact Our Team
                </a> */}
              {/* <button className="w-full border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Schedule Visit
                </button> */}
              {/* <a
                  href="mailto:support@homobie.com"
                  className="w-full border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Mail className="w-5 h-5" />
                  Send Enquiry
                </a>
              </div> */}
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal &&
        property.imageUrls &&
        property.imageUrls.length > 0 && (
          <div
            className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowImageModal(false)}
          >
            <div
              className="relative max-w-6xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowImageModal(false)}
                aria-label="Close image gallery"
                // RESPONSIVE FIX: Move button inside on small screens
                className="absolute top-2 right-2 sm:-top-4 sm:-right-4 z-10 bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <PropertyImage
                src={property.imageUrls[selectedImageIndex]}
                alt={`${property.title} ${selectedImageIndex + 1}`}
                className="max-w-full max-h-[90dvh] object-contain rounded-lg shadow-2xl"
                loading="eager"
              />
              {property.imageUrls.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    aria-label="Previous image"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-gray-200/80 hover:bg-gray-300 text-gray-800 p-2 rounded-full transition-colors shadow-sm"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    aria-label="Next image"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-200/80 hover:bg-gray-300 text-gray-800 p-2 rounded-full transition-colors shadow-sm"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-white text-sm backdrop-blur-md">
                    {selectedImageIndex + 1} / {property.imageUrls.length}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
    </div>
  );
};

export default PropertyDetail;
