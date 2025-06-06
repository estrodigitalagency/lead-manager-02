
import { Button } from "@/components/ui/button";
import { Users, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const DashboardHeader = () => {
  const { signOut, user, profile, isAdmin } = useAuth();
  
  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <h1 className="text-2xl font-bold text-primary">Lead Management System</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Benvenuto, {profile ? `${profile.first_name} ${profile.last_name}` : user?.email}
              {profile && (
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                  profile.role === 'admin' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {profile.role === 'admin' ? 'Admin' : 'Manager'}
                </span>
              )}
            </span>
            {isAdmin && (
              <Link to="/users">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Utenti
                </Button>
              </Link>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Esci
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
