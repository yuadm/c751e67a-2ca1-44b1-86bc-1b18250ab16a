import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ReferenceRequest {
  id: string;
  application_id: string;
  reference_type: string;
  reference_name: string;
  reference_email: string;
  reference_data: any;
  status: string;
  expires_at: string;
}

interface JobApplication {
  id: string;
  personal_info: any;
}

export function ReferenceForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [referenceRequest, setReferenceRequest] = useState<ReferenceRequest | null>(null);
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [formData, setFormData] = useState({
    // Common fields
    refereeFullName: '',
    refereeJobTitle: '',
    refereeCompany: '',
    refereeEmail: '',
    refereePhone: '',
    relationshipDuration: '',
    
    // Character reference specific
    personalQualities: '',
    reliability: '',
    integrity: '',
    workEthic: '',
    communication: '',
    
    // Employer reference specific
    employmentDates: '',
    jobPerformance: '',
    attendance: '',
    teamwork: '',
    responsibilities: '',
    reasonForLeaving: '',
    rehireRecommendation: '',
    
    // Common final fields
    overallRecommendation: '',
    additionalComments: '',
    dateCompleted: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    
    if (!token) {
      toast({
        title: "Invalid Link",
        description: "This reference link is missing or invalid.",
        variant: "destructive",
      });
      return;
    }
    
    fetchReferenceRequest(token);
  }, [location.search]);

  const fetchReferenceRequest = async (token: string) => {
    try {
      // For demo purposes, set some mock data based on the token
      const referenceType = token.includes('emp') ? 'employer' : 'character';
      
      setReferenceRequest({
        id: 'ref-' + token.slice(0, 8),
        application_id: 'app-123',
        reference_type: referenceType,
        reference_name: 'Reference Person',
        reference_email: 'reference@example.com',
        reference_data: {},
        status: 'sent',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      setApplication({
        id: 'app-123',
        personal_info: { fullName: 'Job Applicant' }
      });

      setFormData(prev => ({
        ...prev,
        refereeEmail: 'reference@example.com',
        refereeFullName: 'Reference Person'
      }));

    } catch (error) {
      console.error('Error fetching reference request:', error);
      toast({
        title: "Error",
        description: "Failed to load reference request.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!referenceRequest) return;

      // Create reference response using generic insert
      const { error: responseError } = await supabase
        .from('reference_responses' as any)
        .insert({
          request_id: referenceRequest.id,
          response_data: formData,
          completed_by_name: formData.refereeFullName,
          completed_by_email: formData.refereeEmail
        });

      if (responseError) throw responseError;

      // For demo purposes, just simulate success
      // In real implementation, this would update the database

      toast({
        title: "Reference Submitted",
        description: "Thank you for providing your reference. It has been submitted successfully.",
      });

      // Show success message instead of navigating
      setReferenceRequest(prev => prev ? { ...prev, status: 'completed' } : null);

    } catch (error) {
      console.error('Error submitting reference:', error);
      toast({
        title: "Error",
        description: "Failed to submit reference. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!referenceRequest || !application) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-2">Reference Not Found</h2>
        <p className="text-muted-foreground">This reference link is invalid or has expired.</p>
      </div>
    );
  }

  if (referenceRequest.status === 'completed') {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-2">Reference Already Submitted</h2>
        <p className="text-muted-foreground">Thank you for providing your reference. It has been successfully submitted.</p>
      </div>
    );
  }

  const applicantName = application.personal_info?.fullName || 'the applicant';
  const isEmployerReference = referenceRequest.reference_type === 'employer';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {isEmployerReference ? 'Employer Reference' : 'Character Reference'} for {applicantName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Referee Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="refereeFullName">Your Full Name *</Label>
              <Input
                id="refereeFullName"
                value={formData.refereeFullName}
                onChange={(e) => setFormData(prev => ({ ...prev, refereeFullName: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="refereeJobTitle">Your Job Title *</Label>
              <Input
                id="refereeJobTitle"
                value={formData.refereeJobTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, refereeJobTitle: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="refereeCompany">Company/Organization *</Label>
              <Input
                id="refereeCompany"
                value={formData.refereeCompany}
                onChange={(e) => setFormData(prev => ({ ...prev, refereeCompany: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="refereePhone">Contact Phone *</Label>
              <Input
                id="refereePhone"
                type="tel"
                value={formData.refereePhone}
                onChange={(e) => setFormData(prev => ({ ...prev, refereePhone: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="relationshipDuration">How long have you known {applicantName}? *</Label>
            <Input
              id="relationshipDuration"
              value={formData.relationshipDuration}
              onChange={(e) => setFormData(prev => ({ ...prev, relationshipDuration: e.target.value }))}
              placeholder="e.g., 2 years, 6 months"
              required
            />
          </div>

          {/* Reference Type Specific Questions */}
          {isEmployerReference ? (
            <>
              <div>
                <Label htmlFor="employmentDates">Employment Dates *</Label>
                <Input
                  id="employmentDates"
                  value={formData.employmentDates}
                  onChange={(e) => setFormData(prev => ({ ...prev, employmentDates: e.target.value }))}
                  placeholder="e.g., January 2020 - December 2022"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="responsibilities">Key Responsibilities *</Label>
                <Textarea
                  id="responsibilities"
                  value={formData.responsibilities}
                  onChange={(e) => setFormData(prev => ({ ...prev, responsibilities: e.target.value }))}
                  placeholder="Describe their main duties and responsibilities"
                  required
                />
              </div>

              <div>
                <Label htmlFor="jobPerformance">Job Performance Rating *</Label>
                <RadioGroup 
                  value={formData.jobPerformance} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, jobPerformance: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="excellent" id="perf-excellent" />
                    <Label htmlFor="perf-excellent">Excellent</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="good" id="perf-good" />
                    <Label htmlFor="perf-good">Good</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="satisfactory" id="perf-satisfactory" />
                    <Label htmlFor="perf-satisfactory">Satisfactory</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="below-average" id="perf-below" />
                    <Label htmlFor="perf-below">Below Average</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="attendance">Attendance and Punctuality *</Label>
                <RadioGroup 
                  value={formData.attendance} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, attendance: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="excellent" id="att-excellent" />
                    <Label htmlFor="att-excellent">Excellent</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="good" id="att-good" />
                    <Label htmlFor="att-good">Good</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fair" id="att-fair" />
                    <Label htmlFor="att-fair">Fair</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="poor" id="att-poor" />
                    <Label htmlFor="att-poor">Poor</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="reasonForLeaving">Reason for Leaving</Label>
                <Textarea
                  id="reasonForLeaving"
                  value={formData.reasonForLeaving}
                  onChange={(e) => setFormData(prev => ({ ...prev, reasonForLeaving: e.target.value }))}
                  placeholder="Please describe the reason for leaving"
                />
              </div>

              <div>
                <Label htmlFor="rehireRecommendation">Would you rehire this person? *</Label>
                <RadioGroup 
                  value={formData.rehireRecommendation} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, rehireRecommendation: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="rehire-yes" />
                    <Label htmlFor="rehire-yes">Yes, without reservation</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes-with-reservations" id="rehire-reservations" />
                    <Label htmlFor="rehire-reservations">Yes, with some reservations</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="rehire-no" />
                    <Label htmlFor="rehire-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="personalQualities">Personal Qualities *</Label>
                <Textarea
                  id="personalQualities"
                  value={formData.personalQualities}
                  onChange={(e) => setFormData(prev => ({ ...prev, personalQualities: e.target.value }))}
                  placeholder="Describe their character, personality, and personal qualities"
                  required
                />
              </div>

              <div>
                <Label htmlFor="reliability">Reliability and Trustworthiness *</Label>
                <RadioGroup 
                  value={formData.reliability} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, reliability: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="excellent" id="rel-excellent" />
                    <Label htmlFor="rel-excellent">Excellent</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="good" id="rel-good" />
                    <Label htmlFor="rel-good">Good</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fair" id="rel-fair" />
                    <Label htmlFor="rel-fair">Fair</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="poor" id="rel-poor" />
                    <Label htmlFor="rel-poor">Poor</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="integrity">Integrity and Honesty *</Label>
                <RadioGroup 
                  value={formData.integrity} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, integrity: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="excellent" id="int-excellent" />
                    <Label htmlFor="int-excellent">Excellent</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="good" id="int-good" />
                    <Label htmlFor="int-good">Good</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fair" id="int-fair" />
                    <Label htmlFor="int-fair">Fair</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="poor" id="int-poor" />
                    <Label htmlFor="int-poor">Poor</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="communication">Communication Skills *</Label>
                <RadioGroup 
                  value={formData.communication} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, communication: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="excellent" id="comm-excellent" />
                    <Label htmlFor="comm-excellent">Excellent</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="good" id="comm-good" />
                    <Label htmlFor="comm-good">Good</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fair" id="comm-fair" />
                    <Label htmlFor="comm-fair">Fair</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="poor" id="comm-poor" />
                    <Label htmlFor="comm-poor">Poor</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          {/* Common Questions */}
          <div>
            <Label htmlFor="overallRecommendation">Overall Recommendation *</Label>
            <RadioGroup 
              value={formData.overallRecommendation} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, overallRecommendation: value }))}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="highly-recommend" id="rec-highly" />
                <Label htmlFor="rec-highly">Highly Recommend</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="recommend" id="rec-recommend" />
                <Label htmlFor="rec-recommend">Recommend</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="recommend-with-reservations" id="rec-reservations" />
                <Label htmlFor="rec-reservations">Recommend with Reservations</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="not-recommend" id="rec-not" />
                <Label htmlFor="rec-not">Do Not Recommend</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="additionalComments">Additional Comments</Label>
            <Textarea
              id="additionalComments"
              value={formData.additionalComments}
              onChange={(e) => setFormData(prev => ({ ...prev, additionalComments: e.target.value }))}
              placeholder="Any additional information you would like to provide"
              rows={4}
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button
              type="submit"
              disabled={submitting}
              className="min-w-32"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Reference'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}