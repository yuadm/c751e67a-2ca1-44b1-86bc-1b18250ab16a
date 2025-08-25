import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ReferenceData {
  applicant_name: string;
  position_applied_for: string;
  company_name: string;
  reference_name: string;
}

interface FormData {
  relationship_nature: string;
  relationship_duration: string;
  professional_capabilities: string;
  work_ethic: string;
  relevant_skills: string;
  reliability_punctuality: string;
  would_rehire: string;
  would_rehire_reason: string;
  additional_comments: string;
}

export default function Reference() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [valid, setValid] = useState(false);
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    relationship_nature: '',
    relationship_duration: '',
    professional_capabilities: '',
    work_ethic: '',
    relevant_skills: '',
    reliability_punctuality: '',
    would_rehire: '',
    would_rehire_reason: '',
    additional_comments: ''
  });

  useEffect(() => {
    const title = 'Job Reference | Provide Reference';
    const desc = 'Secure reference submission for job applicants.';
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);

    const canonicalHref = `${window.location.origin}/reference`;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonicalHref);
  }, [location.search]);

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('reference-portal', {
        method: 'GET',
        body: null,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) throw error;

      if (data.valid) {
        setValid(true);
        setReferenceData(data.data);
      } else {
        setValid(false);
        toast({
          title: "Invalid Link",
          description: data.error || "This reference link is invalid or has expired.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error validating token:', error);
      setValid(false);
      toast({
        title: "Error",
        description: "Failed to validate reference link.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.relationship_nature || !formData.would_rehire) {
      toast({
        title: "Please fill required fields",
        description: "Please complete all required fields marked with *",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('reference-portal', {
        body: {
          token,
          responses: formData
        },
      });

      if (error) throw error;

      if (data.success) {
        setSubmitted(true);
        toast({
          title: "Reference Submitted",
          description: "Thank you for providing your reference!",
        });
      } else {
        throw new Error(data.error || 'Failed to submit reference');
      }
    } catch (error: any) {
      console.error('Error submitting reference:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit reference. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Validating reference link...</span>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-green-600">Reference Submitted Successfully</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p>Thank you for taking the time to provide a reference for {referenceData?.applicant_name}.</p>
            <p>Your feedback has been submitted and this link is now expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token || !valid || !referenceData) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Invalid Reference Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Your secure reference link is missing, invalid, or has expired. Please use the link provided in your email.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Provide a Job Reference</h1>
        <p className="text-muted-foreground mt-2">
          Reference for <strong>{referenceData.applicant_name}</strong> applying for <strong>{referenceData.position_applied_for}</strong> at <strong>{referenceData.company_name}</strong>
        </p>
      </header>

      <main>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Professional Reference Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="relationship_nature" className="text-base font-medium">
                  What is the nature and duration of your relationship with {referenceData.applicant_name}? *
                </Label>
                <Textarea
                  id="relationship_nature"
                  value={formData.relationship_nature}
                  onChange={(e) => updateFormData('relationship_nature', e.target.value)}
                  placeholder="Please describe your professional relationship..."
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="professional_capabilities" className="text-base font-medium">
                  How would you describe their professional capabilities and work ethic?
                </Label>
                <Textarea
                  id="professional_capabilities"
                  value={formData.professional_capabilities}
                  onChange={(e) => updateFormData('professional_capabilities', e.target.value)}
                  placeholder="Please describe their capabilities and work approach..."
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="relevant_skills" className="text-base font-medium">
                  Any relevant skills or qualities that would be pertinent to this role?
                </Label>
                <Textarea
                  id="relevant_skills"
                  value={formData.relevant_skills}
                  onChange={(e) => updateFormData('relevant_skills', e.target.value)}
                  placeholder="Please describe relevant skills and qualities..."
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="reliability_punctuality" className="text-base font-medium">
                  How would you rate their reliability and punctuality?
                </Label>
                <Textarea
                  id="reliability_punctuality"
                  value={formData.reliability_punctuality}
                  onChange={(e) => updateFormData('reliability_punctuality', e.target.value)}
                  placeholder="Please comment on their reliability and punctuality..."
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-base font-medium">Would you employ this person again? *</Label>
                <RadioGroup
                  value={formData.would_rehire}
                  onValueChange={(value) => updateFormData('would_rehire', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="rehire_yes" />
                    <Label htmlFor="rehire_yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="rehire_no" />
                    <Label htmlFor="rehire_no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.would_rehire === 'no' && (
                <div>
                  <Label htmlFor="would_rehire_reason" className="text-base font-medium">
                    If not, why not?
                  </Label>
                  <Textarea
                    id="would_rehire_reason"
                    value={formData.would_rehire_reason}
                    onChange={(e) => updateFormData('would_rehire_reason', e.target.value)}
                    placeholder="Please explain your reason..."
                    className="mt-2"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="additional_comments" className="text-base font-medium">
                  Any additional comments or information you'd like to share?
                </Label>
                <Textarea
                  id="additional_comments"
                  value={formData.additional_comments}
                  onChange={(e) => updateFormData('additional_comments', e.target.value)}
                  placeholder="Any additional information..."
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting} className="min-w-[120px]">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Reference'
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
