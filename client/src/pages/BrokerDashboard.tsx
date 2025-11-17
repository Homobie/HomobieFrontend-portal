import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Target,
  Plus,
} from "lucide-react";

// --- UI Components ---
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// --- Hooks and Services ---
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// --- Layout & Dialog Components ---
import { EnhancedRoleBasedNavbar } from "@/components/layout/EnhancedRoleBasedNavbar";
import { EnhancedAssignLeadDialog } from "@/components/dashboard/EnhancedAssignLeadDialog";
import { CreateTeam } from "@/components/dashboard/CreateTeam";

// --- API and Types ---
const API_BASE_URL = import.meta.env.VITE_BASE_URL;

// Types matching backend DTOs
interface TelecallerResponse {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  totalCalls: number;
}

interface LeadResponse {
  leadId: string;
  firstName: string;
  lastName: string;
  email: string;
  loanType: string;
  loanAmount: number;
  status: string;
}

// --- Main Dashboard Component ---
export default function ThemedBrokerDashboard() {
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showAssignLead, setShowAssignLead] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<LeadResponse[]>([]);
  const { toast } = useToast();
  const { user, logout } = useAuth();

  const userId = user?.userId || "null";
  const token = localStorage.getItem("auth_token") || "";
  
  // Reusable authenticated fetch function
  const authenticatedFetch = async (url: string) => {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Network response was not ok for ${url}`);
    }
    // Assuming count endpoints return a number directly
    // If they return { "count": 10 }, you'll need response.json()
    // and then to access .count in the `useQuery` `select` option
    // For now, assuming it returns just the number.
    const data = await response.json();
    return data;
  };

  // --- Data Queries ---
  // const { data: telecallers = [], isLoading: telecallersLoading } = useQuery<TelecallerResponse[]>({
  //   queryKey: ["brokerTelecallers", userId], 
  //   queryFn: () => authenticatedFetch(`${API_BASE_URL}/api/team/broker/${userId}`),
  //   enabled: !!userId && !!token,
  // });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<LeadResponse[]>({
    queryKey: ["brokerLeads"],
    queryFn: () => authenticatedFetch(`${API_BASE_URL}/leads/unassigned`),
    enabled: !!token,
  });

  const { data: countByOwner = 0, isLoading: countByOwnerLoading } = useQuery<number>({
    queryKey: ["leadCountByOwner", userId],
    queryFn: () => authenticatedFetch(`${API_BASE_URL}/properties/countByOwner/${userId}`),
    enabled: !!userId && !!token,
    // If API returns { "count": 10 }, add this line:
    // select: (data) => data.count, 
  });

  const { data: countByAddedBy = 0, isLoading: countByAddedByLoading } = useQuery<number>({
    queryKey: ["leadCountByAddedBy", userId],
    queryFn: () => authenticatedFetch(`${API_BASE_URL}/leads/countByAddedBy/${userId}`),
    enabled: !!userId && !!token,
    // If API returns { "count": 10 }, add this line:
    // select: (data) => data.count,
  });

  const stats = [
    {
      title: "My Properties",
      value: countByOwner,
      icon: Plus,
      loading: countByOwnerLoading,
    },
    {
      title: "My Added Leads",
      value: countByAddedBy,
      icon: Users, // Using the imported 'Plus' icon
      loading: countByAddedByLoading,
    },
  ];
  // --- END: Updated stats array ---

  const quickActions = [
    {
      title: "Add Team Member",
      description: "Invite telecallers to your team.",
      icon: Users,
      action: () => setShowCreateTeam(true),
    },
    {
      title: "Assign Leads",
      description: "Distribute leads to your team.",
      icon: Target,
      action: () => {
        // This logic still correctly uses the 'leads' query (unassigned leads)
        const unassigned = leads.filter((l) => l.status === "new");
        setSelectedLeads(unassigned);
        setShowAssignLead(true);
      },
    },
  ];

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <EnhancedRoleBasedNavbar
          user={
            user
              ? {
                  id: Number(user.userId),
                  username: `${user.firstName} ${user.lastName || ""}`.trim(),
                  ...user,
                }
              : null
          }
          onLogout={logout}
        />
        <main className="p-4 md:p-8 pt-20 md:pt-[80px] space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Broker Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Here's an overview of your properties and leads.
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* This map now uses the new 'stats' array */}
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {/* --- UPDATED: Loading logic is now per-card --- */}
                  <div className="text-2xl font-bold">
                    {stat.loading ? "..." : stat.value}
                  </div>
                  {/* --- END: Updated loading logic --- */}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Team Members (Commented out in your original) */}
            {/* <div className="lg:col-span-2"> ... </div> */}
            
            {/* Right Column: Quick Actions (Commented out in your original) */}
            {/* <div className="space-y-6"> ... </div> */}
          </div>
        </main>
      </div>

      {/* Dialogs (Commented out in your original) */}
      {/* <CreateTeam open={showCreateTeam} onOpenChange={setShowCreateTeam} />
      <EnhancedAssignLeadDialog
        open={showAssignLead}
        onOpenChange={setShowAssignLead}
        selectedLeads={selectedLeads}
        telecallers={telecallers} 
      /> */}
    </>
  );
}