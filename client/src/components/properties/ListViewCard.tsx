import React from "react";
import { Heart, Share2, Camera, MapPin, Bed, Bath, Square } from "lucide-react";

const ListViewCard = ({ property, files, ownerName }) => {
  const locationString = property.location
    ? `${property.location.addressLine1 || ""}, ${property.location.city || ""}, ${property.location.state || ""}`.replace(
        /^,\s*|,\s*$/g,
        ""
      )
    : "Location not available";

  const imageSrc = files && files.length > 0 ? files[0] : "/placeholder.jpg";

  // Helper functions to format status text (optional but good practice)
  const formatConstructionStatus = (status) => {
    if (!status) return "Status Unknown";
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatPropertyStatus = (status) => {
    if (!status) return "Status Unknown";
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Helper function to get status color classes
  const getConstructionStatusClasses = (status) => {
    if (!status) return "bg-gray-100 text-gray-800 border-gray-200";
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes("ready")) {
      return "bg-green-100 text-green-800 border-green-200";
    } else if (lowerStatus.includes("construction")) {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getPropertyStatusClasses = (status) => {
    if (!status) return "bg-gray-100 text-gray-800 border-gray-200";
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes("available")) {
      return "bg-green-100 text-green-800 border-green-200";
    } else if (lowerStatus.includes("sold")) {
      return "bg-red-100 text-red-800 border-red-200";
    }
    return "bg-orange-100 text-orange-800 border-orange-200";
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-500 p-5 mb-4 group hover:shadow-xl">
      <div className="flex flex-col sm:flex-row gap-5">
        {/* Image */}
        <div className="relative rounded-xl flex-shrink-0">
          <div className="relative w-full sm:w-40 h-40 sm:h-28 rounded-xl flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300">
            <img
              src={imageSrc}
              alt={property.title || "Property"}
              className="object-cover w-full h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
          </div>
          <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md text-white px-2 py-1 rounded-full text-xs flex items-center gap-1 border border-white/10">
            <Camera className="w-2.5 h-2.5" />
            {files?.length || 0}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start mb-3">
            <div>
              <h3 className="text-gray-900 font-bold text-lg mb-1">
                {property.title || "Property Title"}
              </h3>
              <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                <MapPin className="w-3.5 h-3.5" />
                <span>{locationString}</span>
              </div>
              {/* Owner Info Removed */}
              {/* {ownerName && (
                <div className="text-gray-500 text-xs mt-1">
                  By: {ownerName}
                </div>
              )} */}
            </div>
            <div className="text-left sm:text-right mt-2 sm:mt-0">
              <div className="text-gray-900 text-xl font-bold">
                ₹
                {property.discountPrice
                  ? parseFloat(property.discountPrice).toFixed(2)
                  : parseFloat(property.actualPrice || 0).toFixed(2)}
              </div>
              {property.actualPrice &&
                property.discountPrice &&
                parseFloat(property.discountPrice) <
                  parseFloat(property.actualPrice) && (
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-sm line-through">
                      ₹{parseFloat(property.actualPrice).toFixed(2)}
                    </span>
                    <span className="text-green-600 text-xs">
                      Save ₹
                      {(
                        parseFloat(property.actualPrice) -
                        parseFloat(property.discountPrice)
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
              <div className="text-gray-600 text-sm mt-1">
                Contact for area details
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="flex items-center flex-wrap gap-x-6 gap-y-2 text-gray-600 text-sm mb-4">
            {property.bedrooms && (
              <div className="flex items-center gap-1.5">
                <Bed className="w-4 h-4" />
                <span>{property.bedrooms} BHK</span>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center gap-1.5">
                <Bath className="w-4 h-4" />
                <span>{property.bathrooms} Bath</span>
              </div>
            )}
            {property.areaSqft && (
              <div className="flex items-center gap-1.5">
                <Square className="w-4 h-4" />
                <span>{property.areaSqft} sqft</span>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {property.type && (
              <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-200">
                {property.type}
              </span>
            )}
            {property.constructionStatus && (
              <span
                className={`px-3 py-1 rounded-full text-xs border ${getConstructionStatusClasses(property.constructionStatus)}`}
              >
                {formatConstructionStatus(property.constructionStatus)}
              </span>
            )}
            {property.propertyStatus && (
              <span
                className={`px-3 py-1 rounded-full text-xs border ${getPropertyStatusClasses(property.propertyStatus)}`}
              >
                {formatPropertyStatus(property.propertyStatus)}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <button className="bg-white/30 backdrop-blur-lg text-gray-800 py-2 px-4 rounded-xl font-medium hover:bg-white/40 transition-all duration-300 border border-white/20 hover:shadow-lg transform hover:scale-[1.02]">
              View More
            </button>
            <div className="flex gap-2">
              <button className="text-gray-500 hover:text-red-500 p-2 transition-all duration-300 hover:bg-gray-100 rounded-lg">
                <Heart className="w-4 h-4" />
              </button>
              <button className="text-gray-500 hover:text-gray-900 p-2 transition-all duration-300 hover:bg-gray-100 rounded-lg">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListViewCard;
