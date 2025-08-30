
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Badge, Building, User } from 'lucide-react';
import { CompanyProvider, useCompany } from '@/contexts/CompanyContext';

function PublicHomeContent() {
  const { user, userRole, loading } = useAuth();
  const { companySettings, loading: companyLoading } = useCompany();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && userRole !== null) {
      // Redirect authenticated users to their appropriate dashboard
      if (userRole === 'admin') {
        navigate('/admin');
      } else if (userRole === 'user') {
        // For regular users, redirect to admin panel as they should have access to basic features
        navigate('/admin');
      }
    }
  }, [user, userRole, loading, navigate]);

  if (loading || (user && userRole === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show both job application and employee login for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 pt-8">
          <div className="mx-auto mb-6 w-20 h-20 bg-primary/10 rounded-lg flex items-center justify-center">
            {!companyLoading && companySettings.logo ? (
              <img
                src={companySettings.logo}
                alt={companySettings.name}
                className="h-16 w-16 object-contain"
              />
            ) : (
              <Building className="w-10 h-10 text-primary" />
            )}
          </div>
          <h1 className="text-4xl font-bold mb-2">{!companyLoading ? companySettings.name : 'Welcome to Our Company'}</h1>
          <p className="text-lg text-muted-foreground mb-2">{!companyLoading && companySettings.tagline}</p>
          <p className="text-lg text-muted-foreground">Choose what you need to do today</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Job Application Portal */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Apply for a Job</CardTitle>
              <CardDescription>
                Join our team! Submit your application and we'll review it promptly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => navigate('/job-application')} 
                className="w-full"
                size="lg"
              >
                Start Application
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Complete our multi-step application form with your details, experience, and skills
              </p>
            </CardContent>
          </Card>

          {/* Employee Portal */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-secondary" />
              </div>
              <CardTitle className="text-2xl">Employee Portal</CardTitle>
              <CardDescription>
                Current employees: Login to manage your leave requests and view your information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full"
                size="lg"
              >
                Login
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Access your dashboard to request leaves, view leave history, and manage your documents. 
                The system will automatically detect your account type.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function PublicHome() {
  return (
    <CompanyProvider>
      <PublicHomeContent />
    </CompanyProvider>
  );
}
