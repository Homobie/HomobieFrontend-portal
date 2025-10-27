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
  Eye,
  Building2,
  Mail,
  MapPin,
  User,
  Users,
  UserPlus,
  ShieldCheck,
  Loader2,
  Search,
  Pencil,
} from "lucide-react";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EnhancedRoleBasedNavbar } from "@/components/layout/EnhancedRoleBasedNavbar";
import { useAuth } from "@/hooks/useAuth";
import type { Lead } from "@/types/api";
import { Country, State, City } from "country-state-city";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const LOAN_STATUS_OPTIONS = [
  { value: "IN_PROCESS", label: "In Process" },
  { value: "DOCUMENTS_PENDING", label: "Documents Pending" },
  { value: "DOCUMENTS_RECEIVED", label: "Documents Received" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "LOGIN_WITH_BANK", label: "Login with Bank" },
  { value: "SOFT_SANCTIONED", label: "Soft Sanctioned" },
  { value: "TECHNICAL_APPROVAL", label: "Technical Approval" },
  { value: "LEGAL_APPROVAL", label: "Legal Approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "DISBURSED", label: "Disbursed" },
  { value: "PART_DISBURSED", label: "Partially Disbursed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CLOSED", label: "Closed" },
  { value: "ON_HOLD", label: "On Hold" },
];
const updateLeadSchema = z.object({
  status: z.string().min(1, "Status is required"),
});

type UpdateLeadFormData = z.infer<typeof updateLeadSchema>;

const SalesDashboard = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [builders, setBuilders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  
  const [selectedBuilder, setSelectedBuilder] = useState(null);
  const [builderLeads, setBuilderLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadsError, setLeadsError] = useState(null);
  const [viewingLead, setViewingLead] = useState<LeadDetailsResponse | null>(
    null
  );

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
  const userId = localStorage.getItem("userId") || user?.userId;
  useEffect(() => {
    if (user?.userId) {
      fetchBuilders();
    }
  }, [user]);

  const updateLeadMutation = useMutation({
    mutationFn: async ({
      leadId,
      data,
    }: {
      leadId: string;
      data: UpdateLeadFormData;
    }) => {
      const token = localStorage.getItem("auth_token");
      const baseUrl = import.meta.env.VITE_BASE_URL;
      const params = new URLSearchParams();
      params.append("leadId", leadId);
      params.append("status", data.status);

      const url = `${baseUrl}/leads/updateStatus?${params.toString()}`;

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let responseData;
      try {
        responseData = await response.clone().json();
      } catch {
        responseData = await response.text();
      }

      if (!response.ok) {
        const message =
          (typeof responseData === "object" &&
            (responseData?.message ||
              responseData?.detail ||
              responseData?.error)) ||
          (typeof responseData === "string" && responseData) ||
          `Server responded with status ${response.status}`;
        throw new Error(message);
      }

      return responseData;
    },
    onSuccess: async (data, variables) => {
      setBuilderLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead.leadId === variables.leadId
            ? { ...lead, leadStatus: variables.data.status }
            : lead
        )
      );

      toast({
        title: "Success",
        description:
          typeof data === "string"
            ? data
            : data?.message ||
              data?.detail ||
              data?.error ||
              "Status updated successfully.",
      });
    },

    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error?.message ||
          error?.response?.data?.message ||
          "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    const lowerStatus = status?.toLowerCase() || "default";
    const statuses: { [key: string]: string } = {
      in_process: "bg-blue-500/20 text-blue-100 border-blue-500/30",
      documents_pending:
        "bg-yellow-500/20 text-yellow-100 border-yellow-500/30",
      documents_received: "bg-cyan-500/20 text-cyan-100 border-cyan-500/30",
      under_review: "bg-purple-500/20 text-purple-100 border-purple-500/30",
      login_with_bank: "bg-indigo-500/20 text-indigo-100 border-indigo-500/30",
      soft_sanctioned:
        "bg-emerald-500/20 text-emerald-100 border-emerald-500/30",
      technical_approval:
        "bg-orange-500/20 text-orange-100 border-orange-500/30",
      legal_approval: "bg-rose-500/20 text-rose-100 border-rose-500/30",
      approved: "bg-green-500/20 text-green-100 border-green-500/30",
      disbursed: "bg-lime-500/20 text-lime-100 border-lime-500/30",
      part_disbursed: "bg-amber-500/20 text-amber-100 border-amber-500/30",
      rejected: "bg-red-500/20 text-red-100 border-red-500/30",
      closed: "bg-gray-500/20 text-gray-100 border-gray-500/30",
      on_hold: "bg-slate-500/20 text-slate-100 border-slate-500/30",
      default: "bg-gray-500/20 text-black border-gray-500/30",
    };
    return statuses[lowerStatus] || statuses.default;
  };

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

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

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
      setBuilders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching builders:", err);
      setError(err.message || "Failed to load builders");
    } finally {
      setLoading(false);
    }
  };

  const fetchBuilderLeads = async (builderId) => {
    try {
      setLoadingLeads(true);
      setLeadsError(null);
      setBuilderLeads([]);
      const userId = localStorage.getItem("userId") || user?.userId;
      const token = localStorage.getItem("auth_token") || user?.token;
      if (!token) throw new Error("Authentication token not found");

      const url = `${import.meta.env.VITE_BASE_URL}/leads/get/${builderId}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.message || `Failed to fetch leads: ${response.statusText}`
        );
      }

      const data = await response.json();
      setBuilderLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching builder leads:", err);
      setLeadsError(err.message || "Failed to load leads");
    } finally {
      setLoadingLeads(false);
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

          location: {
            country: countryName,
            state: stateName,
            city: formData.city.trim(),
            pincode: formData.pincode.trim(),
            addressLine1: formData.addressLine1.trim(),
          },
        },
      };

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

      let data;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }
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
    <div className="min-h-screen bg-transparent pt-12">
      <EnhancedRoleBasedNavbar user={user} onLogout={logout} />

      <div className="p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-grey-300 mb-2">
              Sales Dashboard
            </h1>
            <p className="text-black">
              Manage your builders and track performance
            </p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-white hover:bg-gray-200 border border-gray-300 text-black"
          >
            <Plus className="w-5 h-5" />
            Add Builder
          </Button>
        </div>

        <GlassCard className="p-4 bg-white border-gray-200">
          <h2 className="text-2xl font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-gray-600" />
            Registered Builders
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 border-4 border-gray-400 border-t-black rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-black text-lg">Loading builders...</p>
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
                className="bg-gray-100 hover:bg-gray-200 text-black border border-gray-400"
              >
                Retry
              </Button>
            </div>
          ) : builders.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-2" />
              <p className="text-black text-lg">No builders added yet</p>
              <p className="text-gray-500 text-sm mt-1">
                Click "Add Builder" to get started
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-black">
              {builders.map((builder, index) => (
                <div
                  key={builder.id || index}
                  className="py-3 px-4 hover:bg-gray-100 transition-all flex flex-col gap-1 cursor-pointer"
                  onClick={() => {
                    setSelectedBuilder(builder);
                    fetchBuilderLeads(builder.builderId);
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-black/90">
                      {builder.fullName}
                    </h3>
                  </div>

                  <div className="text-black text-sm flex flex-wrap gap-2 mt-1">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4 text-black" />
                      {builder.companyName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4 text-black" />
                      {builder.email}
                    </span>
                    {builder.phoneNumber && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4 text-black" />
                        {builder.phoneNumber}
                      </span>
                    )}
                    {(builder.city || builder.state || builder.country) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-black" />
                        {[builder.city, builder.state, builder.country]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                  </div>

                  {builder.reraId && (
                    <p className="text-black text-xs mt-1">
                      RERA ID:{" "}
                      <span className="text-black">{builder.reraId}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
        {selectedBuilder && (
          <GlassCard className="mt-2 p-4 bg-white border-gray-200">
            <h2 className="text-xl font-bold text-black mb-4">
              Leads for {selectedBuilder.fullName}
            </h2>

            {loadingLeads ? (
              <p className="text-black">Loading leads...</p>
            ) : leadsError ? (
              <p className="text-red-600">{leadsError}</p>
            ) : builderLeads.length === 0 ? (
              <p className="text-black">No leads registered for this builder</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left border border-gray-700 rounded-lg overflow-hidden">
                  <thead className="bg-white text-black">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Name</th>
                      <th className="px-6 py-3 font-semibold">Phone</th>
                      <th className="px-6 py-3 font-semibold">Address</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white text-black">
                    {builderLeads.map((lead, i) => (
                      <tr
                        key={lead.leadId || i}
                        className="border-t border-gray-700 transition-all"
                      >
                        <td className="px-6 py-4 text-black font-medium">
                          {lead.firstName} {lead.lastName}
                        </td>
                        <td className="px-6 py-4 text-black">
                          {lead.phoneNumber || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-black">
                          {[
                            lead.location?.addressLine1,
                            lead.location?.city,
                            lead.location?.state,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                          {lead.location?.pincode
                            ? ` - ${lead.location.pincode}`
                            : ""}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            {editingLeadId === lead.leadId ? (
                              <Select
                                value={editingStatus}
                                onValueChange={(newStatus) => {
                                  setEditingStatus(newStatus);
                                  updateLeadMutation.mutate({
                                    leadId: lead.leadId,
                                    data: { status: newStatus },
                                  });
                                  setEditingLeadId(null);
                                }}
                              >
                                <SelectTrigger className="w-32 h-8 bg-black/10 border-white/20 text-black text-xs">
                                  <SelectValue placeholder="Change status" />
                                </SelectTrigger>
                                <SelectContent className="text-xs">
                                  {LOAN_STATUS_OPTIONS.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                className={getStatusColor(lead.leadStatus)}
                              >
                                {lead.leadStatus || "N/A"}
                              </Badge>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6 p-0 ml-1"
                              onClick={() => {
                                if (editingLeadId === lead.leadId) {
                                  setEditingLeadId(null);
                                } else {
                                  setEditingLeadId(lead.leadId);
                                  setEditingStatus(lead.leadStatus || "");
                                }
                              }}
                            >
                              <Pencil size={14} />
                            </Button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewingLead(lead)}
                          >
                            <Eye className="text-black" size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white/70 border-gray-400 transition-none hover:bg-white/80">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-grey-300 flex items-center gap-2">
                    <User className="w-6 h-6" />
                    Add New Builder
                  </h2>
                  <Button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 bg-white hover:bg-gray-100 border-0"
                    disabled={isSubmitting}
                  >
                    <X className="w-6 h-6 text-black" />
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-grey-300 text-sm font-semibold mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-white border border-gray-400 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white0 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Your First Name"
                      />
                    </div>
                    <div>
                      <label className="block text-grey-300 text-sm font-semibold mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-white border border-gray-400 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white0 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Your Last Name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-grey-300 text-sm font-semibold mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 bg-white border border-gray-400 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white0 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Your Email Address"
                    />
                  </div>

                  <div>
                    <label className="block text-grey-300 text-sm font-semibold mb-2">
                      Phone Number (10 digits)
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 bg-white border border-gray-400 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white0 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="9876543210"
                    />
                  </div>
                  <div>
                    <label className="block text-grey-300 text-sm font-semibold mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 bg-white border border-gray-400 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white0 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div>
                    <label className="block text-grey-300 text-sm font-semibold mb-2">
                      RERA ID (optional)
                    </label>
                    <input
                      type="text"
                      name="reraId"
                      value={formData.reraId}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 bg-white border border-gray-400 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white0 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Your RERA ID"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-grey-300 text-sm font-semibold mb-2">
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
                        className="w-full px-4 py-3 bg-white border border-gray-400 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-white0 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <label className="block text-grey-300 text-sm font-semibold mb-2">
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
                        className="w-full px-4 py-3 bg-white border border-gray-400 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-white0 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <label className="block text-grey-300 text-sm font-semibold mb-2">
                        City
                      </label>
                      <select
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        disabled={!formData.state || isSubmitting}
                        className="w-full px-4 py-3 bg-white border border-gray-400 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-white0 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <label className="block text-grey-300 text-sm font-semibold mb-2">
                        Pincode
                      </label>
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        required
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-white border border-gray-400 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white0 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="400001"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-grey-300 text-sm font-semibold mb-2">
                      Address Line 1
                    </label>
                    <input
                      type="text"
                      name="addressLine1"
                      value={formData.addressLine1}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 bg-white border border-gray-400 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white0 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Street address, building name, etc."
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-black font-bold border border-border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
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

      <Dialog open={!!viewingLead} onOpenChange={() => setViewingLead(null)}>
        <DialogContent className="bg-white border-white/20 text-black">
          <DialogHeader>
            <DialogTitle className="text-white">Lead Details</DialogTitle>
            <DialogDescription className="text-black">
              Full information for {viewingLead?.firstName}{" "}
              {viewingLead?.lastName}.
            </DialogDescription>
          </DialogHeader>
          {viewingLead && (
            <div className="space-y-4 py-4">
              <p>
                <User className="inline mr-2" />
                <strong>Name:</strong> {viewingLead.firstName}{" "}
                {viewingLead.lastName}
              </p>
              <p>
                <Phone className="inline mr-2" />
                <strong>Phone:</strong> {viewingLead.phoneNumber}
              </p>
              <p>
                <ShieldCheck className="inline mr-2" />
                <strong>Status:</strong>{" "}
                <Badge className={getStatusColor(viewingLead.leadStatus)}>
                  {viewingLead.leadStatus}
                </Badge>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesDashboard;
