import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  Target,
  CheckCircle,
  TrendingUp,
  Award,
  Plus,
  X,
  Building2,
  Mail,
  MapPin,
  User,
  Loader2,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EnhancedRoleBasedNavbar } from "@/components/layout/EnhancedRoleBasedNavbar";
import { useAuth } from "@/hooks/useAuth";
import type { Lead } from "@/types/api";
import { Country, State, City } from "country-state-city";

const SalesDashboard = () => {
  const { user, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [builders, setBuilders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "Builder",
    companyName: "",
    reraId: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
    addressLine1: "",
  });

  useEffect(() => {
    if (user?.userId) {
      fetchBuilders();
    }
  }, [user]);

  const fetchBuilders = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("auth_token") || user?.token;
      const userId = localStorage.getItem("userId") || user?.userId;

      if (!userId) {
        throw new Error("Sales ID not found");
      }

      const url = `${import.meta.env.VITE_BASE_URL}/sales/getBuilders?salesId=${userId}`;
      console.log("Fetching builders from:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response received:", text.substring(0, 200));
        throw new Error(
          "Server returned non-JSON response. Please check the API URL."
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Failed to fetch builders: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Builders fetched successfully:", data);
      setBuilders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching builders:", err);
      setError(err.message || "Failed to load builders");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const token = localStorage.getItem("auth_token") || user?.token;
    const salesId = localStorage.getItem("userId") || user?.userId;

    if (!token) {
      alert("Authentication token not found. Please log in again.");
      setIsSubmitting(false);
      return;
    }

    if (!salesId) {
      alert("Sales ID not found. Please log in again.");
      setIsSubmitting(false);
      return;
    }

    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      alert("Phone number must be exactly 10 digits");
      setIsSubmitting(false);
      return;
    }

    try {
      const countryName =
        Country.getAllCountries().find((c) => c.isoCode === formData.country)
          ?.name || formData.country;

      const stateName =
        State.getStatesOfCountry(formData.country).find(
          (s) => s.isoCode === formData.state
        )?.name || formData.state;
      const payload = {
        user: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          phoneNumber: phoneDigits,
        },
        roleData: {
          roleType: "BUILDER",
          addedByUserId: salesId,
          companyName: formData.companyName.trim(),
          reraId: formData.reraId.trim(),
          location: {
            country: countryName,
            state: stateName,
            city: formData.city.trim(),
            pincode: formData.pincode.trim(),
            addressLine1: formData.addressLine1.trim(),
          },
        },
      };

      console.log("Sending payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(
        `${import.meta.env.VITE_BASE_URL}/register/user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      console.log("Response status:", response.status);
      let data;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }

      console.log("Response data:", data);

      const message =
        (typeof data === "object" && data?.message) ||
        (typeof data === "string" && data) ||
        `Server responded with status ${response.status}`;

      if (!response.ok) {
        throw new Error(message);
      }

      alert("Builder added successfully!");

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "Builder",
        companyName: "",
        reraId: "",
        country: "",
        state: "",
        city: "",
        pincode: "",
        addressLine1: "",
      });
      setIsModalOpen(false);

      fetchBuilders();
    } catch (err) {
      console.error("Error adding builder:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent pt-20">
      <EnhancedRoleBasedNavbar user={user} onLogout={logout} />

      <div className="p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-green-900/80 mb-2">
              Sales Dashboard
            </h1>
            <p className="text-green-800/60">
              Manage your builders and track performance
            </p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-900"
          >
            <Plus className="w-5 h-5" />
            Add Builder
          </Button>
        </div>

        <GlassCard className="p-4 bg-green-500/5 border-green-500/20">
          <h2 className="text-2xl font-bold text-green-900/80 mb-4 flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Registered Builders
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-green-800/60 text-lg">Loading builders...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                <p className="text-red-700 text-lg font-semibold">
                  Error loading builders
                </p>
                <p className="text-red-600/80 text-sm mt-1">{error}</p>
              </div>
              <Button
                onClick={fetchBuilders}
                className="bg-green-500/20 hover:bg-green-500/30 text-green-900 border border-green-500/40"
              >
                Retry
              </Button>
            </div>
          ) : builders.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-16 h-16 text-green-500/30 mx-auto mb-2" />
              <p className="text-green-800/60 text-lg">No builders added yet</p>
              <p className="text-green-700/40 text-sm mt-1">
                Click "Add Builder" to get started
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-green-500/20">
              {builders.map((builder, index) => (
                <div
                  key={builder.id || index}
                  className="py-3 px-4 hover:bg-green-500/10 transition-all rounded-md flex flex-col gap-1"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-green-900/90">
                      {builder.fullName}
                    </h3>
                  </div>

                  <div className="text-green-800/80 text-sm flex flex-wrap gap-2 mt-1">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4 text-green-700/60" />
                      {builder.companyName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4 text-green-700/60" />
                      {builder.email}
                    </span>
                    {builder.phoneNumber && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4 text-green-700/60" />
                        {builder.phoneNumber}
                      </span>
                    )}
                    {(builder.city || builder.state || builder.country) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-green-700/60" />
                        {[builder.city, builder.state, builder.country]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                  </div>

                  {builder.reraId && (
                    <p className="text-green-700/60 text-xs mt-1">
                      RERA ID:{" "}
                      <span className="text-green-800/90">
                        {builder.reraId}
                      </span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white/70 border-green-500/30 transition-none hover:bg-white/80">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-green-900/80 flex items-center gap-2">
                    <User className="w-6 h-6" />
                    Add New Builder
                  </h2>
                  <Button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 bg-green-500/10 hover:bg-green-500/20 border-0"
                    disabled={isSubmitting}
                  >
                    <X className="w-6 h-6 text-green-900" />
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-green-900/80 text-sm font-semibold mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-green-500/5 border border-green-500/30 rounded-lg text-green-900 placeholder-green-700/40 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Your First Name"
                      />
                    </div>
                    <div>
                      <label className="block text-green-900/80 text-sm font-semibold mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-green-500/5 border border-green-500/30 rounded-lg text-green-900 placeholder-green-700/40 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Your Last Name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-green-900/80 text-sm font-semibold mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 bg-green-500/5 border border-green-500/30 rounded-lg text-green-900 placeholder-green-700/40 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Your Email Address"
                    />
                  </div>

                  <div>
                    <label className="block text-green-900/80 text-sm font-semibold mb-2">
                      Phone Number (10 digits)
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 bg-green-500/5 border border-green-500/30 rounded-lg text-green-900 placeholder-green-700/40 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="9876543210"
                    />
                  </div>

                  <div>
                    <label className="block text-green-900/80 text-sm font-semibold mb-2">
                      Role
                    </label>
                    <input
                      type="text"
                      name="role"
                      value={formData.role}
                      disabled
                      className="w-full px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-700/60 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-green-900/80 text-sm font-semibold mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 bg-green-500/5 border border-green-500/30 rounded-lg text-green-900 placeholder-green-700/40 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div>
                    <label className="block text-green-900/80 text-sm font-semibold mb-2">
                      RERA ID
                    </label>
                    <input
                      type="text"
                      name="reraId"
                      value={formData.reraId}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 bg-green-500/5 border border-green-500/30 rounded-lg text-green-900 placeholder-green-700/40 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Your RERA ID"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-green-900/80 text-sm font-semibold mb-2">
                        Country
                      </label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={(e) => {
                          const countryCode = e.target.value;
                          setFormData({
                            ...formData,
                            country: countryCode,
                            state: "",
                            city: "",
                          });
                        }}
                        required
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-green-500/5 border border-green-500/30 rounded-lg text-green-900 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Country</option>
                        {Country.getAllCountries().map((country) => (
                          <option key={country.isoCode} value={country.isoCode}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-green-900/80 text-sm font-semibold mb-2">
                        State
                      </label>
                      <select
                        name="state"
                        value={formData.state}
                        onChange={(e) => {
                          const stateCode = e.target.value;
                          setFormData({
                            ...formData,
                            state: stateCode,
                            city: "",
                          });
                        }}
                        required
                        disabled={!formData.country || isSubmitting}
                        className="w-full px-4 py-3 bg-green-500/5 border border-green-500/30 rounded-lg text-green-900 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select State</option>
                        {formData.country &&
                          State.getStatesOfCountry(formData.country).map(
                            (state) => (
                              <option key={state.isoCode} value={state.isoCode}>
                                {state.name}
                              </option>
                            )
                          )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-green-900/80 text-sm font-semibold mb-2">
                        City
                      </label>
                      <select
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        disabled={!formData.state || isSubmitting}
                        className="w-full px-4 py-3 bg-green-500/5 border border-green-500/30 rounded-lg text-green-900 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select City</option>
                        {formData.state &&
                          City.getCitiesOfState(
                            formData.country,
                            formData.state
                          ).map((city) => (
                            <option key={city.name} value={city.name}>
                              {city.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-green-900/80 text-sm font-semibold mb-2">
                        Pincode
                      </label>
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        required
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-green-500/5 border border-green-500/30 rounded-lg text-green-900 placeholder-green-700/40 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="400001"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-green-900/80 text-sm font-semibold mb-2">
                      Address Line 1
                    </label>
                    <input
                      type="text"
                      name="addressLine1"
                      value={formData.addressLine1}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 bg-green-500/5 border border-green-500/30 rounded-lg text-green-900 placeholder-green-700/40 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Street address, building name, etc."
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-green-500/20 hover:bg-green-500/30 text-green-900 font-bold border border-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Adding Builder...
                      </span>
                    ) : (
                      "Add Builder"
                    )}
                  </Button>
                </form>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesDashboard;