import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Contact {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  notes?: string;
}

interface ContactUploaderProps {
  campaignId?: string;
  onSuccess?: (contacts: Contact[]) => void;
}

const ContactUploader: React.FC<ContactUploaderProps> = ({ campaignId, onSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedContacts, setUploadedContacts] = useState<Contact[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      return;
    }
    
    // Check file type
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setErrors([]);
    
    try {
      // Read the file
      const text = await readFileAsync(file);
      const contacts = parseCSV(text);
      
      if (contacts.length === 0) {
        throw new Error('No contacts found in the CSV file');
      }
      
      // Validate contacts
      const validatedContacts = validateContacts(contacts);
      
      // Insert contacts into database if campaign ID is provided
      if (campaignId) {
        await saveContactsToDatabase(validatedContacts, campaignId);
      }
      
      setUploadedContacts(validatedContacts);
      
      if (onSuccess) {
        onSuccess(validatedContacts);
      }
      
      toast.success(`Successfully processed ${validatedContacts.length} contacts`);
    } catch (error) {
      toast.error('Failed to process contacts file');
      console.error('Error processing contacts:', error);
      setErrors([error instanceof Error ? error.message : 'Unknown error']);
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
      // Reset file input
      e.target.value = '';
    }
  };
  
  const readFileAsync = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result as string);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  };

  const parseCSV = (text: string): Contact[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const contacts: Contact[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        console.warn(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}`);
        continue;
      }

      const contact: Contact = {
        name: '',
        phone: ''
      };

      headers.forEach((header, index) => {
        const value = values[index]?.replace(/"/g, '') || '';
        
        switch (header) {
          case 'name':
          case 'full_name':
          case 'contact_name':
            contact.name = value;
            break;
          case 'phone':
          case 'phone_number':
          case 'mobile':
            contact.phone = value;
            break;
          case 'email':
          case 'email_address':
            contact.email = value;
            break;
          case 'company':
          case 'organization':
            contact.company = value;
            break;
          case 'notes':
          case 'comments':
            contact.notes = value;
            break;
        }
      });

      if (contact.name && contact.phone) {
        contacts.push(contact);
      }
    }
    
    return contacts;
  };
  
  const validateContacts = (contacts: Contact[]): Contact[] => {
    const validContacts: Contact[] = [];
    const localErrors: string[] = [];
    
    contacts.forEach((contact, index) => {
      if (!contact.name) {
        localErrors.push(`Contact ${index+1}: Name is required`);
        return;
      }
      
      // Basic phone number validation
      if (!contact.phone || !/^[\d\+\-\(\) ]{7,20}$/.test(contact.phone)) {
        localErrors.push(`Contact ${index+1}: Invalid phone number`);
        return;
      }
      
      // Basic email validation if provided
      if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        localErrors.push(`Contact ${index+1}: Invalid email`);
        return;
      }
      
      validContacts.push(contact);
    });
    
    if (localErrors.length > 0) {
      setErrors(prev => [...prev, ...localErrors]);
    }
    
    return validContacts;
  };
  
  const saveContactsToDatabase = async (contacts: Contact[], campaignId: string) => {
    try {
      // Save contacts in batches of 50
      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < contacts.length; i += batchSize) {
        batches.push(contacts.slice(i, i + batchSize));
      }
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const { error } = await supabase
          .from('contacts')
          .insert(
            batch.map(contact => ({
              name: contact.name,
              phone: contact.phone,
              email: contact.email || null,
              custom_fields: contact.company || contact.notes ? {
                company: contact.company,
                notes: contact.notes
              } : {},
              campaign_id: campaignId
            }))
          );
        
        if (error) {
          throw error;
        }
        
        // Update progress for processing (50% to 100%)
        const progress = 50 + Math.round(((i + 1) / batches.length) * 50);
        setUploadProgress(progress);
      }
    } catch (error) {
      console.error('Error saving contacts to database:', error);
      throw new Error('Failed to save contacts to the database');
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Contacts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="flex-1"
            />
            <Button disabled={isUploading}>
              {isUploading ? 'Uploading...' : <Upload className="h-4 w-4 mr-2" />}
              Upload
            </Button>
          </div>
          
          {isUploading && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
          
          {uploadedContacts.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>Successfully uploaded {uploadedContacts.length} contacts</span>
              </div>
            </div>
          )}
          
          {errors.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <XCircle className="h-5 w-5" />
                <span>Errors found in upload:</span>
              </div>
              <ul className="text-sm list-disc pl-6 space-y-1 text-red-600">
                {errors.slice(0, 5).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {errors.length > 5 && <li>...and {errors.length - 5} more errors</li>}
              </ul>
            </div>
          )}
          
          <div className="text-sm text-gray-500 mt-2">
            <p>Upload a CSV file with the following columns:</p>
            <p><strong>Required:</strong> name, phone</p>
            <p><strong>Optional:</strong> email, company, notes</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactUploader;
