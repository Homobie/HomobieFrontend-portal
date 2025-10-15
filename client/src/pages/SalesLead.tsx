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

// ### Data Structures ###

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
  loanStatus: string;
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
});

type CreateLeadFormData = z.infer<typeof createLeadSchema>;

const updateLeadSchema = z.object({
  loanStatus: z.string().min(1, "Status is required"),
});

type UpdateLeadFormData = z.infer<typeof updateLeadSchema>;

// ### Main Component ###

export default function SalesLead() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ### State Management ###
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadDetailsResponse | null>(null);
  const [viewingLead, setViewingLead] = useState<LeadDetailsResponse | null>(null);
  const [selectedCountry, setSelectedCountry] = useState("IN");
  const [selectedState, setSelectedState] = useState("");

  const statesList = State.getStatesOfCountry(selectedCountry);
  const citiesList = selectedState
    ? City.getCitiesOfState(selectedCountry, selectedState)
    : [];

  // ### Data Fetching ###
  const { data: leads = [], isLoading } = useQuery<LeadDetailsResponse[]>({
    queryKey: ["leads", user?.userId],
    queryFn: async () => {
      if (!user?.userId) return [];
      const token = localStorage.getItem("auth_token");

      try {
        const response = await apiRequest(`/leads/get/${user.userId}`, {
          headers: { Authorization: `Bearer ${token}` },
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

  // Client-side filtering
  const filteredLeads = leads.filter(
    (lead) =>
      `${lead.firstName} ${lead.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      lead.phoneNumber.includes(searchTerm)
  );

  // ### Create Lead Mutation ###
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

  // ### Update Lead Mutation ###
  const updateLeadMutation = useMutation({
    mutationFn: async ({
      leadId,
      data,
    }: {
      leadId: string;
      data: UpdateLeadFormData;
    }) => {
      const token = localStorage.getItem("auth_token");
      return await apiRequest(`/leads/${leadId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Lead status updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setEditingLead(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update lead.",
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

  const handleEditOpen = (lead: LeadDetailsResponse) => {
    setEditingLead(lead);
    editForm.reset({ loanStatus: lead.loanStatus });
  };

  const onCreateSubmit = (data: CreateLeadFormData) => {
    createLeadMutation.mutate(data);
  };

  const onUpdateSubmit = (data: UpdateLeadFormData) => {
    if (editingLead) {
      updateLeadMutation.mutate({ leadId: editingLead.leadId, data });
    }
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
      new: "bg-blue-500/20 text-blue-100 border-blue-500/30",
      contacted: "bg-yellow-500/20 text-yellow-100 border-yellow-500/30",
      approved: "bg-emerald-500/20 text-emerald-100 border-emerald-500/30",
      rejected: "bg-red-500/20 text-red-100 border-red-500/30",
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black-900 to-slate-900 relative overflow-hidden">
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
                          <Badge className={getStatusColor(lead.loanStatus)}>
                            {lead.loanStatus || "N/A"}
                          </Badge>
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
        <DialogContent className="max-w-3xl max-h-[90vh] bg-transparent border-none p-0">
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
                        <FormLabel className="text-white">Last Name</FormLabel>
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
                          <FormLabel className="text-white">Country</FormLabel>
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
                          <FormLabel className="text-white">State</FormLabel>
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
                                <SelectItem key={city.name} value={city.name}>
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
                          <FormLabel className="text-white">Pincode</FormLabel>
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
                      {createLeadMutation.isPending ? "Creating..." : "Create Lead"}
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
            <DialogTitle>Lead Details</DialogTitle>
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
                <Badge className={getStatusColor(viewingLead.loanStatus)}>
                  {viewingLead.loanStatus}
                </Badge>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={!!editingLead} onOpenChange={() => setEditingLead(null)}>
        <DialogContent className="bg-slate-800/95 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Edit Lead Status</DialogTitle>
            <DialogDescription className="text-gray-300">
              Update the loan status for {editingLead?.firstName}.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onUpdateSubmit)}
              className="space-y-6 py-4"
            >
              <FormField
                control={editForm.control}
                name="loanStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Loan Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Contacted">Contacted</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingLead(null)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateLeadMutation.isPending}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  {updateLeadMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}