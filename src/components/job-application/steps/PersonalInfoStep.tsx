import { useState, useEffect } from 'react';
import { PersonalInfo } from '../types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DatePicker } from '@/components/ui/date-picker';

interface PersonalInfoStepProps {
  data: PersonalInfo;
  updateData: (field: keyof PersonalInfo, value: string | string[]) => void;
}

interface JobPosition {
  id: string;
  title: string;
  is_active: boolean;
}

interface PersonalSetting {
  id: string;
  setting_type: string;
  value: string;
  is_active: boolean;
  display_order: number;
}

export function PersonalInfoStep({ data, updateData }: PersonalInfoStepProps) {
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [personalSettings, setPersonalSettings] = useState<PersonalSetting[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    fetchJobPositions();
    fetchPersonalSettings();
  }, []);

  const fetchJobPositions = async () => {
    try {
      const { data: positionsData, error } = await supabase
        .from('job_positions')
        .select('id, title, is_active')
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      setPositions(positionsData || []);
    } catch (error) {
      console.error('Error fetching job positions:', error);
      // Fallback to default positions if database fetch fails
      setPositions([
        { id: '1', title: 'Care Assistant', is_active: true },
        { id: '2', title: 'Senior Care Assistant', is_active: true },
        { id: '3', title: 'Care Coordinator', is_active: true },
        { id: '4', title: 'Registered Nurse', is_active: true },
        { id: '5', title: 'Activities Coordinator', is_active: true },
        { id: '6', title: 'Kitchen Assistant', is_active: true },
        { id: '7', title: 'Domestic Assistant', is_active: true },
        { id: '8', title: 'Other', is_active: true }
      ]);
    } finally {
      setLoadingPositions(false);
    }
  };

  const fetchPersonalSettings = async () => {
    try {
      const { data: settingsData, error } = await supabase
        .from('application_personal_settings')
        .select('*')
        .eq('is_active', true)
        .order('setting_type', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPersonalSettings(settingsData || []);
    } catch (error) {
      console.error('Error fetching personal settings:', error);
      // Fallback to default values if database fetch fails
      setPersonalSettings([
        { id: '1', setting_type: 'title', value: 'Mr', is_active: true, display_order: 1 },
        { id: '2', setting_type: 'title', value: 'Mrs', is_active: true, display_order: 2 },
        { id: '3', setting_type: 'title', value: 'Miss', is_active: true, display_order: 3 },
        { id: '4', setting_type: 'title', value: 'Ms', is_active: true, display_order: 4 },
        { id: '5', setting_type: 'title', value: 'Dr', is_active: true, display_order: 5 },
        { id: '6', setting_type: 'title', value: 'Prof', is_active: true, display_order: 6 },
      ]);
    } finally {
      setLoadingSettings(false);
    }
  };

  const getSettingsByType = (type: string) => {
    return personalSettings.filter(s => s.setting_type === type).map(s => s.value);
  };

  const addLanguage = () => {
    if (selectedLanguage && !data.otherLanguages?.includes(selectedLanguage)) {
      const currentLanguages = data.otherLanguages || [];
      updateData('otherLanguages', [...currentLanguages, selectedLanguage]);
      setSelectedLanguage('');
    }
  };

  const removeLanguage = (languageToRemove: string) => {
    const currentLanguages = data.otherLanguages || [];
    updateData('otherLanguages', currentLanguages.filter(l => l !== languageToRemove));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
        <p className="text-muted-foreground mb-6">Fill your personal information and continue to the next step.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Title *</Label>
          <Select value={data.title} onValueChange={(value) => updateData('title', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Title" />
            </SelectTrigger>
            <SelectContent>
              {getSettingsByType('title').map(title => (
                <SelectItem key={title} value={title}>{title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            value={data.fullName}
            onChange={(e) => updateData('fullName', e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => updateData('email', e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="confirmEmail">Confirm Email *</Label>
          <Input
            id="confirmEmail"
            type="email"
            value={data.confirmEmail}
            onChange={(e) => updateData('confirmEmail', e.target.value)}
            required
            className={data.email && data.confirmEmail && data.email !== data.confirmEmail ? "border-destructive" : ""}
          />
          {data.email && data.confirmEmail && data.email !== data.confirmEmail && (
            <p className="text-sm text-destructive mt-1">Emails do not match</p>
          )}
        </div>

        <div>
          <Label htmlFor="telephone">Telephone/Mobile *</Label>
          <Input
            id="telephone"
            type="tel"
            value={data.telephone}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9+\-\s()]/g, '');
              updateData('telephone', value);
            }}
            placeholder="Enter your phone number"
            required
          />
        </div>

        <div>
          <Label htmlFor="dateOfBirth">Date of Birth *</Label>
          <DatePicker
            selected={data.dateOfBirth ? new Date(data.dateOfBirth) : undefined}
            onChange={(date) => {
              updateData('dateOfBirth', date ? date.toISOString().split('T')[0] : '');
            }}
            placeholder="Select date of birth"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="streetAddress">Street Address *</Label>
          <Input
            id="streetAddress"
            value={data.streetAddress}
            onChange={(e) => updateData('streetAddress', e.target.value)}
            required
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="streetAddress2">Street Address Second Line</Label>
          <Input
            id="streetAddress2"
            value={data.streetAddress2}
            onChange={(e) => updateData('streetAddress2', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="town">Town *</Label>
          <Input
            id="town"
            value={data.town}
            onChange={(e) => updateData('town', e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="borough">Borough *</Label>
          <Select value={data.borough} onValueChange={(value) => updateData('borough', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {getSettingsByType('borough').map(borough => (
                <SelectItem key={borough} value={borough}>{borough}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="postcode">Postcode *</Label>
          <Input
            id="postcode"
            value={data.postcode}
            onChange={(e) => updateData('postcode', e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="englishProficiency">Proficiency in English (if not first language) *</Label>
          <Select value={data.englishProficiency} onValueChange={(value) => updateData('englishProficiency', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {getSettingsByType('english_level').map(level => (
                <SelectItem key={level} value={level}>{level}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="positionAppliedFor">Position applied for *</Label>
          <Select value={data.positionAppliedFor} onValueChange={(value) => updateData('positionAppliedFor', value)}>
            <SelectTrigger>
              <SelectValue placeholder={loadingPositions ? "Loading positions..." : "Select position"} />
            </SelectTrigger>
            <SelectContent>
              {positions.map(position => (
                <SelectItem key={position.id} value={position.title}>{position.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {data.positionAppliedFor && (
          <div>
            <Label htmlFor="personalCareWillingness">Which personal care Are you willing to do? *</Label>
            <Select value={data.personalCareWillingness} onValueChange={(value) => updateData('personalCareWillingness', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-md z-50">
                {getSettingsByType('personal_care_option').map(option => (
                  <SelectItem key={option.toLowerCase()} value={option.toLowerCase()}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="hasDBS">Do you have a recent or updated DBS? *</Label>
          <Select value={data.hasDBS} onValueChange={(value) => updateData('hasDBS', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {getSettingsByType('dbs_option').map(option => (
                <SelectItem key={option.toLowerCase()} value={option.toLowerCase()}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="hasCarAndLicense">Do you currently have your own car and licence? *</Label>
          <Select value={data.hasCarAndLicense} onValueChange={(value) => updateData('hasCarAndLicense', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="nationalInsuranceNumber">National Insurance Number *</Label>
          <Input
            id="nationalInsuranceNumber"
            value={data.nationalInsuranceNumber}
            onChange={(e) => updateData('nationalInsuranceNumber', e.target.value)}
            placeholder="AB123456C"
            required
          />
        </div>
      </div>

      <div>
        <Label>Which other languages do you speak? *</Label>
        <div className="space-y-3 mt-2">
          <div className="flex gap-2">
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-md z-50">
                {getSettingsByType('language')
                  .filter(lang => !data.otherLanguages?.includes(lang))
                  .map(language => (
                    <SelectItem key={language} value={language}>{language}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button 
              type="button" 
              onClick={addLanguage} 
              disabled={!selectedLanguage}
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          
          {data.otherLanguages && data.otherLanguages.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selected Languages:</Label>
              <div className="flex flex-wrap gap-2">
                {data.otherLanguages.map(language => (
                  <div key={language} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm">
                    <span>{language}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLanguage(language)}
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}