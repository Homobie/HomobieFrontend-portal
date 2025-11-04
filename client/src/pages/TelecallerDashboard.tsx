import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, Target, CheckCircle, TrendingUp, Award, Pencil } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EnhancedRoleBasedNavbar } from "@/components/layout/EnhancedRoleBasedNavbar";
import { useAuth } from "@/hooks/useAuth";
import type { Lead } from "@/types/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function TelecallerDashboard() {
  const { user, logout } = useAuth();
  const token = localStorage.getItem("auth_token");
  const telecallerId = user?.userId;

  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showAllLeads, setShowAllLeads] = useState(false);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState([
    {
      title: "Total Calls Today",
      value: 0,
      icon: Phone,
      change: "0%",
      gradient: "from-blue-500/20 to-cyan-500/20",
    },
    {
      title: "Assigned Leads",
      value: 0,
      icon: Target,
      change: "0%",
      gradient: "from-emerald-500/20 to-teal-500/20",
    },
    {
      title: "Successful Calls",
      value: 0,
      icon: CheckCircle,
      change: "0%",
      gradient: "from-green-500/20 to-emerald-500/20",
    },
    {
      title: "Conversion Rate",
      value: "0%",
      icon: TrendingUp,
      change: "0%",
      gradient: "from-purple-500/20 to-pink-500/20",
    },
  ]);
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
      params.append("source", "telecaller");

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
      toast({
        title: "Success",
        description:
          typeof data === "string"
            ? data
            : data?.message ||
              data?.detail ||
              data?.error ||
              "Operation successful.",
      });
      await fetchAllLeads();
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
      in_process: "bg-blue-500/20 text-black border-blue-500/30",
      documents_pending:
        "bg-yellow-500/20 text-black border-yellow-500/30",
      documents_received: "bg-cyan-500/20 text-black border-cyan-500/30",
      under_review: "bg-purple-500/20 text-black border-purple-500/30",
      login_with_bank: "bg-indigo-500/20 text-black border-indigo-500/30",
      soft_sanctioned:
        "bg-emerald-500/20 text-black border-emerald-500/30",
      technical_approval:
        "bg-orange-500/20 text-black border-orange-500/30",
      legal_approval: "bg-rose-500/20 text-black border-rose-500/30",
      approved: "bg-green-500/20 text-black border-green-500/30",
      disbursed: "bg-lime-500/20 text-black border-lime-500/30",
      part_disbursed: "bg-amber-500/20 text-black border-amber-500/30",
      rejected: "bg-red-500/20 text-black border-red-500/30",
      closed: "bg-gray-500/20 text-black border-gray-500/30",
      on_hold: "bg-slate-500/20 text-black border-slate-500/30",
      default: "bg-gray-500/20 text-black border-gray-500/30",
    };
    return statuses[lowerStatus] || statuses.default;
  };

  const fetchAllLeads = async () => {
    if (!telecallerId) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BASE_URL}/telecallers/getLeads/${telecallerId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch leads");
      const data = await response.json();
      setAllLeads(Array.isArray(data) ? data : data.leads || []);
      setShowAllLeads(true);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPerformance = async () => {
    if (!telecallerId) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BASE_URL}/telecallers/performance/${telecallerId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch performance");
      const data = await response.json();
      setStats([
        {
          title: "Total Calls Today",
          value: data.totalCalls || 0,
          icon: Phone,
          change: "+0%",
          gradient: "from-blue-500/20 to-cyan-500/20",
        },
        {
          title: "Assigned Leads",
          value: data.totalLeads || 0,
          icon: Target,
          change: "+0%",
          gradient: "from-emerald-500/20 to-teal-500/20",
        },
        {
          title: "Successful Calls",
          value: data.successfulCalls || 0,
          icon: CheckCircle,
          change: "+0%",
          gradient: "from-green-500/20 to-emerald-500/20",
        },
        {
          title: "Conversion Rate",
          value: `${data.conversionRate || 0}%`,
          icon: TrendingUp,
          change: "+0%",
          gradient: "from-purple-500/20 to-pink-500/20",
        },
      ]);
    } catch (err) {
      console.error("Error fetching performance:", err);
    }
  };

  useEffect(() => {
    fetchPerformance();
    const interval = setInterval(fetchPerformance, 30000);
    return () => clearInterval(interval);
  }, [telecallerId, token]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      <EnhancedRoleBasedNavbar user={user} onLogout={logout} />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 p-4 md:p-6 space-y-6 md:space-y-8 pt-20 md:pt-12"
      >
        <motion.div variants={itemVariants} className="text-center space-y-2">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-700">
            Telecaller Portal
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Manage your leads, track calls, and monitor performance
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <GlassCard
                gradient="neutral"
                blur="md"
                hover
                className="p-6 h-full"
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient}`}
                  >
                    <stat.icon className="h-6 w-6 text-black" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {stat.change}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-black">{stat.value}</p>
                  <p className="text-sm text-gray-700">{stat.title}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={itemVariants}>
          <GlassCard gradient="neutral" blur="md" className="p-6">
            <h3 className="text-xl font-semibold text-black mb-4">
              Today's Performance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Call Success Rate</span>
                  <span className="text-emerald-400 font-semibold">
                    {stats[2].value && stats[0].value
                      ? `${Math.round(
                          (stats[2].value / (stats[0].value || 1)) * 100
                        )}%`
                      : "0%"}
                  </span>
                </div>
                <Progress
                  value={
                    stats[2].value && stats[0].value
                      ? (stats[2].value / (stats[0].value || 1)) * 100
                      : 0
                  }
                  className="h-2"
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Lead Conversion</span>
                  <span className="text-blue-400 font-semibold">
                    {stats[3].value}
                  </span>
                </div>
                <Progress value={parseInt(stats[3].value)} className="h-2" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Daily Target</span>
                  <span className="text-purple-400 font-semibold">
                    {`${(stats[0].value * 100).toFixed(0)}%`}
                  </span>
                </div>
                <Progress value={stats[0].value * 100} className="h-2" />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <GlassCard gradient="neutral" blur="md" className="p-6">
            <h3 className="text-xl font-semibold text-black mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button className="h-16 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 hover:from-blue-500/30 hover:to-cyan-500/30">
                <Phone className="h-6 w-6 mr-2" />
                Start Calling
              </Button>
              <Button
                className="h-16 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 hover:from-emerald-500/30 hover:to-teal-500/30"
                onClick={fetchAllLeads}
              >
                <Target className="h-6 w-6 mr-2" />
                View All Leads
              </Button>
              <Button className="h-16 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:from-purple-500/30 hover:to-pink-500/30">
                <Award className="h-6 w-6 mr-2" />
                Performance Report
              </Button>
            </div>
          </GlassCard>
        </motion.div>

        {showAllLeads && (
          <GlassCard
            gradient="neutral"
            blur="md"
            className="p-6 w-full space-y-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-black">All Leads</h3>
              <Button
                size="sm"
                className="bg-red-500/20 hover:bg-red-500/30"
                onClick={() => setShowAllLeads(false)}
              >
                Close
              </Button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-auto">
              {allLeads.length === 0 ? (
                <p className="text-gray-700 text-center py-4">
                  No leads added yet
                </p>
              ) : (
                allLeads.map((lead) => (
                  <div
                    key={lead.leadId}
                    className="p-4 bg-white/10 backdrop-blur-md rounded-xl shadow-sm hover:shadow-md transition border border-white/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-black">
                            {lead.firstName[0]}
                            {lead.lastName[0]}
                          </span>
                        </div>
                        <p className="font-semibold text-black text-lg">
                          {lead.firstName} {lead.lastName}
                        </p>
                      </div>
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
                        
                    </div>

                    <div className="text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-y-1">
                      <p>
                        <span className="font-medium text-gray-600">
                          Phone:
                        </span>{" "}
                        {lead.phoneNumber || "N/A"}
                      </p>
                      <p>
                        <span className="font-medium text-gray-600">City:</span>{" "}
                        {lead.location?.city || "N/A"}
                      </p>
                      <p>
                        <span className="font-medium text-gray-600">
                          State:
                        </span>{" "}
                        {lead.location?.state || "N/A"}
                      </p>
                      <p>
                        <span className="font-medium text-gray-600">
                          Pincode:
                        </span>{" "}
                        {lead.location?.pincode || "N/A"}
                      </p>
                      <p className="md:col-span-2">
                        <span className="font-medium text-gray-600">
                          Address:
                        </span>{" "}
                        {lead.location?.addressLine1 || "N/A"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        )}
      </motion.div>
    </div>
  );
}
