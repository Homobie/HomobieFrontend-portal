import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Country, State, City } from "country-state-city";
import {
  Plus,
  Search,
  Eye,
  Phone,
  MapPin,
  User,
  UserPlus,
  ShieldCheck,
  Users,
  Mail,
  Home,
  Pencil,
} from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EnhancedRoleBasedNavbar } from "@/components/layout/EnhancedRoleBasedNavbar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface LocationResponse {
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
}

interface LeadDetailsResponse {
  leadId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  location: LocationResponse;
  leadStatus: string;
}

interface CreateLeadDTO {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  roleData: {
    roleType: "USER";
    addedByUserId: string;
    location: {
      country: string;
      state: string;
      city: string;
      pincode: string;
      addressLine1: string;
    };
  };
}
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

const createLeadSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().min(10, "Valid phone number is required"),
  country: z.string().min(1, "Country is required"),
  state: z.string().min(1, "State is required"),
  city: z.string().min(1, "City is required"),
  pincode: z.string().min(6, "Valid pincode is required"),
  addressLine1: z.string().min(1, "Address is required"),
  aadharNumber: z
    .string()
    .length(12, "Aadhar number must be 12 digits")
    .regex(/^\d{12}$/, "Aadhar number must contain only digits"),
  panNumber: z
    .string()
    .length(10, "PAN number must be 10 characters")
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN number format"),
});

type CreateLeadFormData = z.infer<typeof createLeadSchema>;

const updateLeadSchema = z.object({
  status: z.string().min(1, "Status is required"),
});

type UpdateLeadFormData = z.infer<typeof updateLeadSchema>;

export default function SalesLead() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewingLead, setViewingLead] = useState<LeadDetailsResponse | null>(
    null
  );
  const [selectedCountry, setSelectedCountry] = useState("IN");
  const [selectedState, setSelectedState] = useState("");

  const statesList = State.getStatesOfCountry(selectedCountry);
  const citiesList = selectedState
    ? City.getCitiesOfState(selectedCountry, selectedState)
    : [];

  const { data: leads = [], isLoading } = useQuery<LeadDetailsResponse[]>({
    queryKey: ["leads", user?.userId],
    queryFn: async () => {
      if (!user?.userId) return [];
      const token = localStorage.getItem("auth_token");

      try {
        const response = await apiRequest(`/leads/get/${user.userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Access-Control-Allow-Origin": "*",
          },
        });
        return Array.isArray(response) ? response : [];
      } catch (error) {
        toast({
          title: "Error",
          description: "Could not fetch leads.",
          variant: "destructive",
        });
        return [];
      }
    },
    enabled: !!user?.userId,
  });

  const filteredLeads = leads.filter(
    (lead) =>
      `${lead.firstName} ${lead.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      lead.phoneNumber.includes(searchTerm)
  );

  const createLeadMutation = useMutation({
    mutationFn: async (newLeadData: CreateLeadFormData) => {
      const currentUserId = user?.userId;
      const currentToken = localStorage.getItem("auth_token");

      if (!currentUserId || !currentToken) {
        throw new Error("User not authenticated. Please log in again.");
      }

      const dto: CreateLeadDTO = {
        user: {
          firstName: newLeadData.firstName,
          lastName: newLeadData.lastName,
          email: newLeadData.email,
          phoneNumber: newLeadData.phoneNumber,
        },
        roleData: {
          roleType: "USER",
          addedByUserId: currentUserId,
          location: {
            country: newLeadData.country,
            state: newLeadData.state,
            city: newLeadData.city,
            pincode: newLeadData.pincode,
            addressLine1: newLeadData.addressLine1,
          },
        },
      };

      const response = await fetch(
        `${import.meta.env.VITE_BASE_URL}/register/user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify(dto),
        }
      );

      let data;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }

      const message =
        (typeof data === "object" &&
          (data?.message || data?.detail || data?.error)) ||
        (typeof data === "string" && data) ||
        `Server responded with status ${response.status}`;

      if (!response.ok) {
        throw new Error(message);
      }

      return { message };
    },

    onSuccess: (data) => {
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["leads", user?.userId] });

      toast({
        title: "Success",
        description: data?.message || "Lead created successfully!",
      });

      createForm.reset();
    },

    onError: (err: any) => {
      console.error("Create Lead Error:", err);
      toast({
        title: "Error",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

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

      // throw error for non-2xx responses
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
    onSuccess: async (data) => {
      // Invalidate and refetch leads to show updated status
      await queryClient.invalidateQueries({
        queryKey: ["leads", user?.userId],
      });

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

  // ### Form Handling ###
  const createForm = useForm<CreateLeadFormData>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      country: "India",
      state: "",
      city: "",
      pincode: "",
      addressLine1: "",
    },
  });

  const editForm = useForm<UpdateLeadFormData>({
    resolver: zodResolver(updateLeadSchema),
  });

  const onCreateSubmit = (data: CreateLeadFormData) => {
    createLeadMutation.mutate(data);
  };

  // ### Helper Functions ###
  const formatAddress = (location: LocationResponse) => {
    const parts = [
      location.addressLine1,
      location.addressLine2,
      location.city,
      location.state,
    ];
    return `${parts.filter(Boolean).join(", ")} - ${location.pincode}`;
  };

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
      default: "bg-gray-500/20 text-gray-100 border-gray-500/30",
    };
    return statuses[lowerStatus] || statuses.default;
  };

  // ### Animation Variants ###
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black-900 to-slate-900 relative overflow-y-auto">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

      <EnhancedRoleBasedNavbar user={user} onLogout={logout} />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 p-4 md:p-6 space-y-6 pt-24"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">
            Lead Management
          </h1>
          <p className="text-lg text-gray-300 mt-2">
            View and manage your leads.
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div variants={itemVariants}>
          <GlassCard blur="md" className="p-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative flex-1 w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-100 h-4 w-4" />
                <Input
                  placeholder="Search by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="w-full md:w-auto bg-gradient-to-r bg-emerald-400/80 hover:bg-emerald-400/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            </div>
          </GlassCard>
        </motion.div>

        {/* Leads Table */}
        <motion.div variants={itemVariants}>
          <GlassCard blur="md" className="p-0 md:p-2">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-white/20 hover:bg-transparent">
                    <TableHead className="text-white">Name</TableHead>
                    <TableHead className="text-white">Phone</TableHead>
                    <TableHead className="text-white">Address</TableHead>
                    <TableHead className="text-white">Status</TableHead>
                    <TableHead className="text-white text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-gray-400 py-8"
                      >
                        Loading leads...
                      </TableCell>
                    </TableRow>
                  ) : filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-gray-400 py-8"
                      >
                        No leads found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeads.map((lead) => (
                      <TableRow
                        key={lead.leadId}
                        className="border-b-white/10 hover:bg-white/5"
                      >
                        <TableCell className="font-medium text-white">
                          {lead.firstName} {lead.lastName}
                        </TableCell>
                        <TableCell className="text-white text-sm">
                          {lead.phoneNumber}
                        </TableCell>
                        <TableCell className="text-white text-sm">
                          {formatAddress(lead.location)}
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewingLead(lead)}
                          >
                            <Eye size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-transparent border-none p-0">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard gradient="neutral" blur="xl" className="p-4">
              <DialogHeader className="space-y-4 mb-6">
                <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">
                  Add User Lead
                </DialogTitle>
                <DialogDescription className="text-center text-gray-300">
                  Create a new lead for your telecallers
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form
                  onSubmit={createForm.handleSubmit(onCreateSubmit)}
                  className="space-y-6"
                >
                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white flex items-center">
                              <Users className="h-4 w-4 mr-2" />
                              First Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., John"
                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">
                              Last Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Doe"
                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white flex items-center">
                              <Mail className="h-4 w-4 mr-2" />
                              Email Address
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="john.doe@example.com"
                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white flex items-center">
                              <Phone className="h-4 w-4 mr-2" />
                              Phone Number
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="9876543210"
                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-white text-lg font-medium flex items-center">
                        <Home className="h-5 w-5 mr-2" />
                        Address Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={createForm.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">
                                Country
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="India"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                  {...field}
                                  readOnly
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createForm.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">
                                State
                              </FormLabel>
                              <Select
                                onValueChange={(val) => {
                                  field.onChange(val);
                                  setSelectedState(val);
                                }}
                                value={field.value || ""}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                    <SelectValue placeholder="Select state" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {statesList.map((state) => (
                                    <SelectItem
                                      key={state.isoCode}
                                      value={state.isoCode}
                                    >
                                      {state.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">City</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value || ""}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                    <SelectValue placeholder="Select city" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {citiesList.map((city) => (
                                    <SelectItem
                                      key={city.name}
                                      value={city.name}
                                    >
                                      {city.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createForm.control}
                          name="pincode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">
                                Pincode
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="462001"
                                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={createForm.control}
                        name="addressLine1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">
                              Address Line
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="123 ABC Tower, MP Nagar"
                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="aadharNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">
                              Aadhar Number
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="123456789012"
                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createForm.control}
                        name="panNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">
                              PAN Number
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="ABCDE1234F"
                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 uppercase"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(e.target.value.toUpperCase())
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </motion.div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="border-white/20 text-black hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createLeadMutation.isPending}
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                    >
                      {createLeadMutation.isPending
                        ? "Creating..."
                        : "Create Lead"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </GlassCard>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* View Lead Dialog */}
      <Dialog open={!!viewingLead} onOpenChange={() => setViewingLead(null)}>
        <DialogContent className="bg-slate-800/95 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Lead Details</DialogTitle>
            <DialogDescription className="text-gray-300">
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
                <MapPin className="inline mr-2" />
                <strong>Address:</strong> {formatAddress(viewingLead.location)}
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
}
