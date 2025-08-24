import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Eye, FileText, Edit, Trash2, Send, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateJobApplicationPdf } from "@/lib/job-application-pdf";
import { ReviewSummary } from "@/components/job-application/ReviewSummary";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { DateRange } from "react-day-picker";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
// Helper function to format dates from YYYY-MM-DD to DD/MM/YYYY
const formatDateDisplay = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Not provided';
  
  // Check if it's already in DD/MM/YYYY format
  if (dateString.includes('/')) return dateString;
  
  // Convert from YYYY-MM-DD to DD/MM/YYYY
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    return dateString; // Return original if conversion fails
  }
};

interface JobApplication {
  id: string;
  personal_info: any;
  availability: any;
  emergency_contact: any;
  employment_history: any;
  reference_info: any;
  skills_experience: any;
  declarations: any;
  consent: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export type JobApplicationSortField = 'applicant_name' | 'position' | 'created_at' | 'postcode' | 'english_proficiency';
export type JobApplicationSortDirection = 'asc' | 'desc';

export function JobApplicationsContent() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<JobApplicationSortField>('created_at');
  const [sortDirection, setSortDirection] = useState<JobApplicationSortDirection>('desc');
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [statusOptions, setStatusOptions] = useState<string[]>(['new','reviewing','interviewed','accepted','rejected']);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const { toast } = useToast();
  useEffect(() => {
    fetchStatusOptions();
    fetchTimeSlots();
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchApplications();
  }, [searchTerm, statusFilter, sortField, sortDirection, dateRange, page, pageSize]);

  const fetchStatusOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('application_status_settings')
        .select('status_name, display_order, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (!error && data) {
        const opts = data.map((d: any) => d.status_name).filter(Boolean);
        if (opts.length) setStatusOptions(opts);
      }
    } catch (e) {
      // ignore, use defaults
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('application_shift_settings')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (!error && data) {
        setTimeSlots(data);
      }
    } catch (e) {
      console.error('Error fetching time slots:', e);
    }
  };

  const fetchApplications = async () => {
    try {
      let query = supabase
        .from('job_applications')
        .select('*', { count: 'exact' });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setDate(toDate.getDate() + 1); // exclusive upper bound
        query = query.lt('created_at', toDate.toISOString());
      }

      if (searchTerm.trim().length >= 2) {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(
          `personal_info->>fullName.ilike.${term},personal_info->>email.ilike.${term},personal_info->>positionAppliedFor.ilike.${term}`
        );
      }

      if (sortField === 'created_at') {
        query = query.order('created_at', { ascending: sortDirection === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const from = (page - 1) * pageSize;
      const toIdx = from + pageSize - 1;
      const { data, error, count } = await query.range(from, toIdx);

      if (error) throw error;
      setApplications(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to fetch job applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const deleteApplication = async (id: string) => {
    try {
      const { error } = await supabase
        .from('job_applications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setApplications(prev => prev.filter(app => app.id !== id));

      toast({
        title: "Application Deleted",
        description: "The job application has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting application:', error);
      toast({
        title: "Error",
        description: "Failed to delete application",
        variant: "destructive",
      });
    }
  };

  const sendReferenceEmail = (application: JobApplication, referenceIndex: number) => {
    const reference = referenceIndex === 1 
      ? application.employment_history?.recentEmployer 
      : application.employment_history?.previousEmployers?.[0];
    
    if (!reference?.email) {
      toast({
        title: "Error",
        description: "No email address found for this reference",
        variant: "destructive",
      });
      return;
    }

    const applicantName = application.personal_info?.fullName || 
                         `${application.personal_info?.firstName || ''} ${application.personal_info?.lastName || ''}`.trim() ||
                         'Unknown Applicant';
    const position = application.personal_info?.positionAppliedFor || 'Unknown Position';
    const referenceName = reference.name || reference.company || 'Reference';
    const referenceCompany = reference.company || 'Unknown Company';
    const referenceAddress = [
      reference.address,
      reference.address2,
      reference.town,
      reference.postcode
    ].filter(Boolean).join(', ') || 'Address not provided';
    
    const subject = `Reference Request for ${applicantName} - ${position} Position`;
    const body = `Dear ${referenceName},

We hope this email finds you well.

We are writing to request a reference for ${applicantName}, who has applied for the position of ${position} with our company. ${applicantName} has listed you as a reference.

Could you please provide information about:
- The nature and duration of your relationship with ${applicantName}
- Their professional capabilities and work ethic
- Any relevant skills or qualities that would be pertinent to this role
- Their reliability and punctuality
- Would you employ this person again? If not, why not?

Your insights would be greatly appreciated and will help us make an informed decision.

Thank you for your time and assistance.

Best regards,
Mohamed Ahmed
HR Department

Reference Details:
Company: ${referenceCompany}
Contact Person: ${referenceName}
Position: ${reference.position || 'Not specified'}
Phone: ${reference.telephone || 'Not provided'}
Address: ${referenceAddress}

Please complete and return this reference as soon as possible.`;

    const mailtoLink = `mailto:${reference.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  const handleSort = (field: JobApplicationSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: JobApplicationSortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const displayedApplications = sortField === 'created_at'
    ? applications
    : [...applications].sort((a, b) => {
      let aVal: any;
      let bVal: any;
      
      switch (sortField) {
        case 'applicant_name':
          aVal = a.personal_info?.fullName || '';
          bVal = b.personal_info?.fullName || '';
          break;
        case 'position':
          aVal = a.personal_info?.positionAppliedFor || '';
          bVal = b.personal_info?.positionAppliedFor || '';
          break;
        case 'postcode':
          aVal = a.personal_info?.postcode || '';
          bVal = b.personal_info?.postcode || '';
          break;
        case 'english_proficiency':
          aVal = a.personal_info?.englishProficiency || '';
          bVal = b.personal_info?.englishProficiency || '';
          break;
        default:
          return 0;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? comparison : -comparison;
      } else {
        const comparison = (aVal || 0) - (bVal || 0);
        return sortDirection === 'asc' ? comparison : -comparison;
      }
    });

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading job applications...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Applications</h1>
          <p className="text-muted-foreground">Manage and review job applications</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{totalCount}</div>
          <div className="text-sm text-muted-foreground">Total Applications</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by name, email, or position..."
            value={searchTerm}
            onChange={(e) => { setPage(1); setSearchTerm(e.target.value); }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(val) => { setPage(1); setStatusFilter(val); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DatePickerWithRange date={dateRange} setDate={(d) => { setPage(1); setDateRange(d); }} />
      </div>
      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Applications ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>
                     <Button 
                       variant="ghost" 
                       className="p-0 h-auto font-medium hover:bg-transparent"
                       onClick={() => handleSort('applicant_name')}
                     >
                       Applicant {getSortIcon('applicant_name')}
                     </Button>
                   </TableHead>
                   <TableHead>
                     <Button 
                       variant="ghost" 
                       className="p-0 h-auto font-medium hover:bg-transparent"
                       onClick={() => handleSort('position')}
                     >
                       Position Applied {getSortIcon('position')}
                     </Button>
                   </TableHead>
                   <TableHead>
                     <Button 
                       variant="ghost" 
                       className="p-0 h-auto font-medium hover:bg-transparent"
                       onClick={() => handleSort('created_at')}
                     >
                       Date {getSortIcon('created_at')}
                     </Button>
                   </TableHead>
                   <TableHead>
                     <Button 
                       variant="ghost" 
                       className="p-0 h-auto font-medium hover:bg-transparent"
                       onClick={() => handleSort('postcode')}
                     >
                       Postcode {getSortIcon('postcode')}
                     </Button>
                   </TableHead>
                   <TableHead>
                     <Button 
                       variant="ghost" 
                       className="p-0 h-auto font-medium hover:bg-transparent"
                       onClick={() => handleSort('english_proficiency')}
                     >
                       Proficiency In English {getSortIcon('english_proficiency')}
                     </Button>
                   </TableHead>
                   <TableHead>Actions</TableHead>
                 </TableRow>
               </TableHeader>
              <TableBody>
                {displayedApplications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <div className="font-medium">
                        {application.personal_info?.fullName || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {application.personal_info?.positionAppliedFor || 'Not specified'}
                    </TableCell>
                    <TableCell>
                      {new Date(application.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {application.personal_info?.postcode || 'Not provided'}
                    </TableCell>
                    <TableCell>
                      {application.personal_info?.englishProficiency || 'Not specified'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedApplication(application)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-6xl max-h-[90vh]">
                            <DialogHeader>
                              <DialogTitle>Application Details - {application.personal_info?.fullName}</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="max-h-[75vh]">
                              {selectedApplication && (
                                <ApplicationDetails 
                                  application={selectedApplication} 
                                  onUpdate={fetchApplications}
                                  onSendReferenceEmail={sendReferenceEmail}
                                  timeSlots={timeSlots}
                                />
                              )}
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Application</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the application from {application.personal_info?.fullName}? 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteApplication(application.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalCount > pageSize && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) setPage(page - 1);
                }}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const pageNumber = start + i;
              if (pageNumber > totalPages) return null;
              return (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    href="#"
                    isActive={pageNumber === page}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(pageNumber);
                    }}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages) setPage(page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      {displayedApplications.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Job applications will appear here once submitted'
            }
          </p>
        </div>
      )}
    </div>
  );
}

function ApplicationDetails({ 
  application, 
  onUpdate, 
  onSendReferenceEmail,
  timeSlots 
}: { 
  application: JobApplication; 
  onUpdate?: () => void;
  onSendReferenceEmail: (app: JobApplication, refIndex: number) => void;
  timeSlots: any[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(application);
  const { toast } = useToast();

  const toJobAppData = () => {
    const pi = application.personal_info || {};
    const fullName = pi.fullName || `${pi.firstName || ''} ${pi.lastName || ''}`.trim();

    const personalInfo = {
      title: pi.title || '',
      fullName,
      email: pi.email || '',
      confirmEmail: pi.confirmEmail || pi.email || '',
      telephone: pi.telephone || '',
      dateOfBirth: pi.dateOfBirth || pi.dob || '',
      streetAddress: pi.streetAddress || pi.address || '',
      streetAddress2: pi.streetAddress2 || pi.address2 || '',
      town: pi.town || pi.city || '',
      borough: pi.borough || '',
      postcode: pi.postcode || '',
      englishProficiency: pi.englishProficiency || '',
      otherLanguages: Array.isArray(pi.otherLanguages)
        ? pi.otherLanguages
        : (pi.otherLanguages ? String(pi.otherLanguages).split(',').map((s:string)=>s.trim()).filter(Boolean) : []),
      positionAppliedFor: pi.positionAppliedFor || '',
      personalCareWillingness: pi.personalCareWillingness || '',
      hasDBS: pi.hasDBS || '',
      hasCarAndLicense: pi.hasCarAndLicense || '',
      nationalInsuranceNumber: pi.nationalInsuranceNumber || '',
    };

    const av = application.availability || {};
    const availability = {
      timeSlots: av.timeSlots || av.selectedSlots || {},
      hoursPerWeek: av.hoursPerWeek || '',
      hasRightToWork: typeof av.hasRightToWork === 'boolean' ? (av.hasRightToWork ? 'Yes' : 'No') : (av.hasRightToWork || ''),
    };

    const ec = application.emergency_contact || {};
    const emergencyContact = {
      fullName: ec.fullName || '',
      relationship: ec.relationship || '',
      contactNumber: ec.contactNumber || '',
      howDidYouHear: ec.howDidYouHear || '',
    };

    const eh = application.employment_history || {};
    const recent = eh.recentEmployer || null;
    const previous = Array.isArray(eh.previousEmployers) ? eh.previousEmployers : [];
    const previouslyEmployed = typeof eh.previouslyEmployed === 'boolean'
      ? (eh.previouslyEmployed ? 'yes' : 'no')
      : (eh.previouslyEmployed || ((recent || previous.length) ? 'yes' : 'no'));

    const references: Record<string, any> = {};
    let refCount = 0;
    const addRef = (ref: any) => {
      if (!ref) return;
      const hasAny = ref.name || ref.company || ref.email || ref.contactNumber || ref.jobTitle || ref.address;
      if (!hasAny) return;
      refCount += 1;
      references[`reference${refCount}`] = {
        name: ref.name || '',
        company: ref.company || '',
        jobTitle: ref.jobTitle || ref.position || '',
        email: ref.email || '',
        contactNumber: ref.contactNumber || ref.telephone || '',
        address: ref.address || '',
        address2: ref.address2 || '',
        town: ref.town || '',
        postcode: ref.postcode || '',
      };
    };
    const rinfo = application.reference_info || {};
    addRef(rinfo.reference1);
    addRef(rinfo.reference2);
    if (Array.isArray(rinfo.references)) rinfo.references.forEach(addRef);
    if (Array.isArray(rinfo.additionalReferences)) rinfo.additionalReferences.forEach(addRef);
    if (recent) addRef(recent);
    previous.forEach(addRef);

    const skillsExperience = {
      skills: application.skills_experience?.skills || application.skills_experience || {},
    };

    const declaration = application.declarations || {};
    const termsPolicy = application.consent || {};

    return {
      personalInfo,
      availability,
      emergencyContact,
      employmentHistory: {
        previouslyEmployed,
        recentEmployer: recent || undefined,
        previousEmployers: previous || [],
      },
      references: references as any,
      skillsExperience,
      declaration,
      termsPolicy,
    };
  };

  const handleDownloadJson = () => {
    try {
      const data = toJobAppData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'job-application.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('JSON download failed', err);
      toast({ title: 'Download Error', description: 'Failed to download JSON.', variant: 'destructive' });
    }
  };

  const downloadApplication = async () => {
    try {
      await generateJobApplicationPdf(toJobAppData() as any);
      toast({
        title: "PDF Generated",
        description: "The application has been downloaded as a PDF.",
      });
    } catch (err) {
      console.error('PDF generation failed', err);
      toast({
        title: "PDF Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };
  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('job_applications')
        .update({
          personal_info: editData.personal_info,
          availability: editData.availability,
          employment_history: editData.employment_history,
          skills_experience: editData.skills_experience,
          declarations: editData.declarations,
          consent: editData.consent
        })
        .eq('id', editData.id);

      if (error) throw error;

      toast({
        title: "Application Updated",
        description: "The job application has been updated successfully.",
      });

      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating application:', error);
      toast({
        title: "Error",
        description: "Failed to update application",
        variant: "destructive",
      });
    }
  };

  const displayData = isEditing ? editData : application;

  return (
    <div className="space-y-6">
      {/* Header with Edit and Download buttons */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">
            {displayData.personal_info?.fullName || 
             `${displayData.personal_info?.firstName || ''} ${displayData.personal_info?.lastName || ''}`.trim() ||
             'Unknown Applicant'}
          </h3>
          <p className="text-sm text-muted-foreground">
            Applied: {new Date(displayData.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadApplication}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Download PDF
          </Button>
          {isEditing ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>


      {/* Application Content - Using ReviewSummary layout but with editing capability */}
      {isEditing ? (
        // Editing mode - keep the detailed form layout for editing
        <EditableApplicationContent 
          editData={editData}
          setEditData={setEditData}
          onSendReferenceEmail={onSendReferenceEmail}
        />
      ) : (
        // View mode - use comprehensive enhanced layout with proper formatting
        <EnhancedJobApplicationView data={toJobAppData() as any} timeSlotsData={timeSlots} onSendReferenceEmail={onSendReferenceEmail} application={application} />
      )}
      
    </div>
  );
}

// Separate component for editing to keep the existing detailed form layout
function EditableApplicationContent({ 
  editData, 
  setEditData, 
  onSendReferenceEmail 
}: { 
  editData: any; 
  setEditData: (data: any) => void;
  onSendReferenceEmail: (app: JobApplication, refIndex: number) => void;
}) {
  return (
    <>
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Full Name</label>
              <Input
                value={editData.personal_info?.fullName || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  personal_info: { ...editData.personal_info, fullName: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Title</label>
              <Input
                value={editData.personal_info?.title || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  personal_info: { ...editData.personal_info, title: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <Input
                value={editData.personal_info?.email || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  personal_info: { ...editData.personal_info, email: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              <Input
                value={editData.personal_info?.telephone || editData.personal_info?.phone || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  personal_info: { ...editData.personal_info, telephone: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Date of Birth</label>
              <Input
                type="date"
                value={editData.personal_info?.dateOfBirth || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  personal_info: { ...editData.personal_info, dateOfBirth: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Street Address</label>
              <Input
                value={editData.personal_info?.streetAddress || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  personal_info: { ...editData.personal_info, streetAddress: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Position Applied For</label>
              <Input
                value={editData.personal_info?.positionAppliedFor || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  personal_info: { ...editData.personal_info, positionAppliedFor: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Postcode</label>
              <Input
                value={editData.personal_info?.postcode || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  personal_info: { ...editData.personal_info, postcode: e.target.value }
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Availability */}
      <Card>
        <CardHeader>
          <CardTitle>Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Hours Per Week</label>
              <Input
                value={editData.availability?.hoursPerWeek || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  availability: { ...editData.availability, hoursPerWeek: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Right to Work</label>
              <Select
                value={editData.availability?.hasRightToWork || ''}
                onValueChange={(value) => setEditData({
                  ...editData,
                  availability: { ...editData.availability, hasRightToWork: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select right to work status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <Input
                value={editData.emergency_contact?.fullName || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  emergency_contact: { ...editData.emergency_contact, fullName: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Relationship</label>
              <Input
                value={editData.emergency_contact?.relationship || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  emergency_contact: { ...editData.emergency_contact, relationship: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Contact Number</label>
              <Input
                value={editData.emergency_contact?.contactNumber || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  emergency_contact: { ...editData.emergency_contact, contactNumber: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">How Did You Hear About Us</label>
              <Input
                value={editData.emergency_contact?.howDidYouHear || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  emergency_contact: { ...editData.emergency_contact, howDidYouHear: e.target.value }
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Enhanced view component with proper formatting for availability, dates, and references
function EnhancedJobApplicationView({ 
  data, 
  timeSlotsData, 
  onSendReferenceEmail,
  application 
}: { 
  data: any; 
  timeSlotsData: any[];
  onSendReferenceEmail: (app: JobApplication, refIndex: number) => void;
  application: JobApplication;
}) {
  // Helper to get time slot name and times
  const getTimeSlotLabel = (slotId: string) => {
    const slot = timeSlotsData.find(s => s.id === slotId);
    return slot ? `${slot.label} (${slot.start_time} - ${slot.end_time})` : slotId;
  };

  // Format availability with proper time slot names
  const formatAvailability = () => {
    const slots = data.availability?.timeSlots || {};
    const entries = Object.entries(slots);
    
    if (entries.length === 0) {
      return 'No time slots selected';
    }

    return entries.map(([slotId, days]) => {
      const slotLabel = getTimeSlotLabel(slotId);
      const dayList = Array.isArray(days) ? (days as string[]).join(', ') : String(days || '');
      return `${slotLabel}: ${dayList}`;
    }).join('\n');
  };

  // Organize references into clear sections
  const organizeReferences = () => {
    const refs = data.references || {};
    const refEntries = Object.entries(refs).filter(([key, ref]: [string, any]) => 
      ref && (ref.name || ref.company || ref.email)
    );
    
    return {
      reference1: refEntries[0]?.[1] || null,
      reference2: refEntries[1]?.[1] || null,
      hasEmployerRef: application.employment_history?.recentEmployer?.email,
      hasPreviousRef: application.employment_history?.previousEmployers?.[0]?.email
    };
  };

  const refs = organizeReferences();

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>1. Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><span className="font-medium">Title:</span> {data.personalInfo?.title || 'Not provided'}</div>
            <div><span className="font-medium">Full Name:</span> {data.personalInfo?.fullName || 'Not provided'}</div>
            <div><span className="font-medium">Email:</span> {data.personalInfo?.email || 'Not provided'}</div>
            <div><span className="font-medium">Telephone/Mobile:</span> {data.personalInfo?.telephone || 'Not provided'}</div>
            <div><span className="font-medium">Date of Birth:</span> {formatDateDisplay(data.personalInfo?.dateOfBirth)}</div>
            <div><span className="font-medium">Street Address:</span> {data.personalInfo?.streetAddress || 'Not provided'}</div>
            <div><span className="font-medium">Street Address Second Line:</span> {data.personalInfo?.streetAddress2 || 'Not provided'}</div>
            <div><span className="font-medium">Town:</span> {data.personalInfo?.town || 'Not provided'}</div>
            <div><span className="font-medium">Borough:</span> {data.personalInfo?.borough || 'Not provided'}</div>
            <div><span className="font-medium">Postcode:</span> {data.personalInfo?.postcode || 'Not provided'}</div>
            <div><span className="font-medium">Proficiency in English:</span> {data.personalInfo?.englishProficiency || 'Not provided'}</div>
            <div><span className="font-medium">Other Languages:</span> {(data.personalInfo?.otherLanguages || []).join(', ') || 'Not provided'}</div>
            <div><span className="font-medium">Position Applied For:</span> {data.personalInfo?.positionAppliedFor || 'Not provided'}</div>
            <div><span className="font-medium">Personal Care Willingness:</span> {data.personalInfo?.personalCareWillingness || 'Not provided'}</div>
            <div><span className="font-medium">Has DBS:</span> {data.personalInfo?.hasDBS || 'Not provided'}</div>
            <div><span className="font-medium">National Insurance Number:</span> {data.personalInfo?.nationalInsuranceNumber || 'Not provided'}</div>
            <div><span className="font-medium">Has Car and License:</span> {data.personalInfo?.hasCarAndLicense || 'Not provided'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Availability */}
      <Card>
        <CardHeader>
          <CardTitle>2. Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><span className="font-medium">Hours Per Week:</span> {data.availability?.hoursPerWeek || 'Not provided'}</div>
              <div><span className="font-medium">Right to Work in UK:</span> {data.availability?.hasRightToWork || 'Not provided'}</div>
            </div>
            
            <div>
              <span className="font-medium">Selected Time Slots:</span>
              <div className="mt-2 p-3 bg-muted rounded-md">
                <pre className="text-sm whitespace-pre-wrap">{formatAvailability()}</pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle>3. Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><span className="font-medium">Full Name:</span> {data.emergencyContact?.fullName || 'Not provided'}</div>
            <div><span className="font-medium">Relationship:</span> {data.emergencyContact?.relationship || 'Not provided'}</div>
            <div><span className="font-medium">Contact Number:</span> {data.emergencyContact?.contactNumber || 'Not provided'}</div>
            <div><span className="font-medium">How Did You Hear About Us:</span> {data.emergencyContact?.howDidYouHear || 'Not provided'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Employment History */}
      <Card>
        <CardHeader>
          <CardTitle>4. Employment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div><span className="font-medium">Previously Employed:</span> {data.employmentHistory?.previouslyEmployed || 'Not provided'}</div>
            
            {data.employmentHistory?.recentEmployer && (
              <div>
                <h4 className="font-semibold mb-3">Most Recent Employer</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><span className="font-medium">Company:</span> {data.employmentHistory.recentEmployer.company || 'Not provided'}</div>
                  <div><span className="font-medium">Name:</span> {data.employmentHistory.recentEmployer.name || 'Not provided'}</div>
                  <div><span className="font-medium">Email:</span> {data.employmentHistory.recentEmployer.email || 'Not provided'}</div>
                  <div><span className="font-medium">Position:</span> {data.employmentHistory.recentEmployer.position || 'Not provided'}</div>
                  <div><span className="font-medium">Address:</span> {data.employmentHistory.recentEmployer.address || 'Not provided'}</div>
                  <div><span className="font-medium">Town:</span> {data.employmentHistory.recentEmployer.town || 'Not provided'}</div>
                  <div><span className="font-medium">Postcode:</span> {data.employmentHistory.recentEmployer.postcode || 'Not provided'}</div>
                  <div><span className="font-medium">Telephone:</span> {data.employmentHistory.recentEmployer.telephone || 'Not provided'}</div>
                  <div><span className="font-medium">From:</span> {formatDateDisplay(data.employmentHistory.recentEmployer.from)}</div>
                  <div><span className="font-medium">To:</span> {formatDateDisplay(data.employmentHistory.recentEmployer.to)}</div>
                  <div><span className="font-medium">Leaving Date:</span> {formatDateDisplay(data.employmentHistory.recentEmployer.leavingDate)}</div>
                  <div><span className="font-medium">Reason for Leaving:</span> {data.employmentHistory.recentEmployer.reasonForLeaving || 'Not provided'}</div>
                </div>
                {data.employmentHistory.recentEmployer.keyTasks && (
                  <div className="mt-3">
                    <span className="font-medium">Key Tasks/Responsibilities:</span>
                    <p className="mt-1">{data.employmentHistory.recentEmployer.keyTasks}</p>
                  </div>
                )}
              </div>
            )}

            {data.employmentHistory?.previousEmployers?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Previous Employers</h4>
                {data.employmentHistory.previousEmployers.map((emp: any, index: number) => (
                  <div key={index} className="border rounded-md p-4 mb-4">
                    <h5 className="font-medium mb-2">Previous Employer #{index + 1}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><span className="font-medium">Company:</span> {emp.company || 'Not provided'}</div>
                      <div><span className="font-medium">Name:</span> {emp.name || 'Not provided'}</div>
                      <div><span className="font-medium">Email:</span> {emp.email || 'Not provided'}</div>
                      <div><span className="font-medium">Position:</span> {emp.position || 'Not provided'}</div>
                      <div><span className="font-medium">From:</span> {formatDateDisplay(emp.from)}</div>
                      <div><span className="font-medium">To:</span> {formatDateDisplay(emp.to)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* References */}
      <Card>
        <CardHeader>
          <CardTitle>5. References</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Reference 1 */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold">Reference 1</h4>
                {(refs.reference1 as any)?.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSendReferenceEmail(application, 1)}
                    className="flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send Email
                  </Button>
                )}
              </div>
              {refs.reference1 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
                  <div><span className="font-medium">Name:</span> {(refs.reference1 as any).name || 'Not provided'}</div>
                  <div><span className="font-medium">Company:</span> {(refs.reference1 as any).company || 'Not provided'}</div>
                  <div><span className="font-medium">Job Title:</span> {(refs.reference1 as any).jobTitle || 'Not provided'}</div>
                  <div><span className="font-medium">Email:</span> {(refs.reference1 as any).email || 'Not provided'}</div>
                  <div><span className="font-medium">Contact Number:</span> {(refs.reference1 as any).contactNumber || 'Not provided'}</div>
                  <div><span className="font-medium">Address:</span> {(refs.reference1 as any).address || 'Not provided'}</div>
                  <div><span className="font-medium">Town:</span> {(refs.reference1 as any).town || 'Not provided'}</div>
                  <div><span className="font-medium">Postcode:</span> {(refs.reference1 as any).postcode || 'Not provided'}</div>
                </div>
              ) : (
                <p className="text-muted-foreground">No reference 1 provided</p>
              )}
            </div>

            {/* Reference 2 */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold">Reference 2</h4>
                {(refs.reference2 as any)?.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSendReferenceEmail(application, 2)}
                    className="flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send Email
                  </Button>
                )}
              </div>
              {refs.reference2 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
                  <div><span className="font-medium">Name:</span> {(refs.reference2 as any).name || 'Not provided'}</div>
                  <div><span className="font-medium">Company:</span> {(refs.reference2 as any).company || 'Not provided'}</div>
                  <div><span className="font-medium">Job Title:</span> {(refs.reference2 as any).jobTitle || 'Not provided'}</div>
                  <div><span className="font-medium">Email:</span> {(refs.reference2 as any).email || 'Not provided'}</div>
                  <div><span className="font-medium">Contact Number:</span> {(refs.reference2 as any).contactNumber || 'Not provided'}</div>
                  <div><span className="font-medium">Address:</span> {(refs.reference2 as any).address || 'Not provided'}</div>
                  <div><span className="font-medium">Town:</span> {(refs.reference2 as any).town || 'Not provided'}</div>
                  <div><span className="font-medium">Postcode:</span> {(refs.reference2 as any).postcode || 'Not provided'}</div>
                </div>
              ) : (
                <p className="text-muted-foreground">No reference 2 provided</p>
              )}
            </div>

            {/* Additional employer references if available */}
            {(refs.hasEmployerRef || refs.hasPreviousRef) && (
              <div>
                <h4 className="font-semibold mb-3">Employer References</h4>
                <div className="flex gap-2">
                  {refs.hasEmployerRef && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSendReferenceEmail(application, 1)}
                      className="flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Email Recent Employer
                    </Button>
                  )}
                  {refs.hasPreviousRef && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSendReferenceEmail(application, 2)}
                      className="flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Email Previous Employer
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Skills & Experience */}
      <Card>
        <CardHeader>
          <CardTitle>6. Skills & Experience</CardTitle>
        </CardHeader>
        <CardContent>
          {data.skillsExperience?.skills && Object.keys(data.skillsExperience.skills).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(data.skillsExperience.skills).map(([skill, level]) => (
                <div key={skill}>
                  <span className="font-medium">{skill}:</span> {String(level)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No specific skills listed</p>
          )}
        </CardContent>
      </Card>

      {/* Declaration */}
      <Card>
        <CardHeader>
          <CardTitle>7. Declaration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div><span className="font-medium">Social Service Enquiry:</span> {data.declaration?.socialServiceEnquiry || 'Not provided'}</div>
            {data.declaration?.socialServiceDetails && (
              <div><span className="font-medium">Details:</span> {data.declaration.socialServiceDetails}</div>
            )}
            <div><span className="font-medium">Convicted of Offence:</span> {data.declaration?.convictedOfOffence || 'Not provided'}</div>
            {data.declaration?.convictedDetails && (
              <div><span className="font-medium">Details:</span> {data.declaration.convictedDetails}</div>
            )}
            <div><span className="font-medium">Safeguarding Investigation:</span> {data.declaration?.safeguardingInvestigation || 'Not provided'}</div>
            {data.declaration?.safeguardingDetails && (
              <div><span className="font-medium">Details:</span> {data.declaration.safeguardingDetails}</div>
            )}
            <div><span className="font-medium">Criminal Convictions:</span> {data.declaration?.criminalConvictions || 'Not provided'}</div>
            {data.declaration?.criminalDetails && (
              <div><span className="font-medium">Details:</span> {data.declaration.criminalDetails}</div>
            )}
            <div><span className="font-medium">Health Conditions:</span> {data.declaration?.healthConditions || 'Not provided'}</div>
            {data.declaration?.healthDetails && (
              <div><span className="font-medium">Details:</span> {data.declaration.healthDetails}</div>
            )}
            <div><span className="font-medium">Cautions / Reprimands:</span> {data.declaration?.cautionsReprimands || 'Not provided'}</div>
            {data.declaration?.cautionsDetails && (
              <div><span className="font-medium">Details:</span> {data.declaration.cautionsDetails}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Terms & Policy */}
      <Card>
        <CardHeader>
          <CardTitle>8. Terms & Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div><span className="font-medium">Consent to Terms:</span> {data.termsPolicy?.consentToTerms ? 'Yes' : 'No'}</div>
            <div><span className="font-medium">Signature (name):</span> {data.termsPolicy?.signature || 'Not provided'}</div>
            <div><span className="font-medium">Full Name:</span> {data.termsPolicy?.fullName || 'Not provided'}</div>
            <div><span className="font-medium">Date:</span> {formatDateDisplay(data.termsPolicy?.date)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}