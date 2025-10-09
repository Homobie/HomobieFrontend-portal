import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Phone,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  TrendingUp,
  Award,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EnhancedRoleBasedNavbar } from "@/components/layout/EnhancedRoleBasedNavbar";
import { useAuth } from "@/hooks/useAuth";
import type { LeadsResponse, Lead } from "@/types/api";

export default function TelecallerDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAllLeads, setShowAllLeads] = useState(false);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const token = localStorage.getItem("auth_token");
  const telecallerId = user?.userId;

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
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

  const stats = [
    {
      title: "Total Calls Today",
      value: 24,
      icon: Phone,
      change: "+12%",
      gradient: "from-blue-500/20 to-cyan-500/20",
    },
    {
      title: "Assigned Leads",
      value: 0,
      icon: Target,
      change: "+8%",
      gradient: "from-emerald-500/20 to-teal-500/20",
    },
    {
      title: "Successful Calls",
      value: 18,
      icon: CheckCircle,
      change: "+15%",
      gradient: "from-green-500/20 to-emerald-500/20",
    },
    {
      title: "Conversion Rate",
      value: "75%",
      icon: TrendingUp,
      change: "+5%",
      gradient: "from-purple-500/20 to-pink-500/20",
    },
  ];

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

      <EnhancedRoleBasedNavbar user={user} onLogout={logout} />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 p-4 md:p-6 space-y-6 md:space-y-8 pt-20 md:pt-12"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center space-y-2">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-700">
            Telecaller Portal
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Manage your leads, track calls, and monitor performance
          </p>
        </motion.div>

        {/* Stats Grid */}
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

        {/* Performance Overview */}
        <motion.div variants={itemVariants}>
          <GlassCard gradient="neutral" blur="md" className="p-6">
            <h3 className="text-xl font-semibold text-black mb-4">
              Today's Performance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Call Success Rate</span>
                  <span className="text-emerald-400 font-semibold">75%</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Lead Conversion</span>
                  <span className="text-blue-400 font-semibold">60%</span>
                </div>
                <Progress value={60} className="h-2" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Daily Target</span>
                  <span className="text-purple-400 font-semibold">80%</span>
                </div>
                <Progress value={80} className="h-2" />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Assigned Leads */}
        {/* <motion.div variants={itemVariants}>
          <GlassCard gradient="neutral" blur="md" className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-black">
                Assigned Leads
              </h3>
              <Badge
                variant="outline"
                className="text-blue-400 border-blue-400"
              >
                0 Active
              </Badge>
            </div>
          </GlassCard>
        </motion.div> */}

        {/* Quick Actions */}
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
            className="p-6 w-full max-w-4xl space-y-4"
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
              {allLeads.map((lead) => (
                <div
                  key={lead.leadId}
                  className="p-4 bg-white/10 backdrop-blur-md rounded-xl shadow-sm hover:shadow-md transition border border-white/20 space-y-3"
                >
                  {/* Header (Name + Status) */}
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
                    <Badge
                      variant={
                        lead.leadStatus === "TELECALLER_ASSIGNED"
                          ? "secondary"
                          : lead.leadStatus === "COMPLETED"
                            ? "success"
                            : "outline"
                      }
                    >
                      {lead.leadStatus}
                    </Badge>
                  </div>

                  {/* Contact Details */}
                  <div className="text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-y-1">
                    <p>
                      <span className="font-medium text-gray-600">Phone:</span>{" "}
                      {lead.phoneNumber || "N/A"}
                    </p>
                    <p>
                      <span className="font-medium text-gray-600">City:</span>{" "}
                      {lead.location?.city || "N/A"}
                    </p>
                    <p>
                      <span className="font-medium text-gray-600">State:</span>{" "}
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
              ))}
            </div>
          </GlassCard>
        )}
      </motion.div>
    </div>
  );
}
