
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const countries = [
  { code: 'US', name: 'United States', dialCode: '+1' },
  { code: 'CA', name: 'Canada', dialCode: '+1' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
  { code: 'AU', name: 'Australia', dialCode: '+61' },
  { code: 'DE', name: 'Germany', dialCode: '+49' },
  { code: 'FR', name: 'France', dialCode: '+33' },
  { code: 'ES', name: 'Spain', dialCode: '+34' },
  { code: 'IT', name: 'Italy', dialCode: '+39' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31' },
  { code: 'BE', name: 'Belgium', dialCode: '+32' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41' },
  { code: 'AT', name: 'Austria', dialCode: '+43' },
  { code: 'SE', name: 'Sweden', dialCode: '+46' },
  { code: 'NO', name: 'Norway', dialCode: '+47' },
  { code: 'DK', name: 'Denmark', dialCode: '+45' },
  { code: 'FI', name: 'Finland', dialCode: '+358' },
  { code: 'PL', name: 'Poland', dialCode: '+48' },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420' },
  { code: 'HU', name: 'Hungary', dialCode: '+36' },
  { code: 'GR', name: 'Greece', dialCode: '+30' },
  { code: 'PT', name: 'Portugal', dialCode: '+351' },
  { code: 'IE', name: 'Ireland', dialCode: '+353' },
  { code: 'LU', name: 'Luxembourg', dialCode: '+352' },
  { code: 'MT', name: 'Malta', dialCode: '+356' },
  { code: 'CY', name: 'Cyprus', dialCode: '+357' },
  { code: 'SI', name: 'Slovenia', dialCode: '+386' },
  { code: 'SK', name: 'Slovakia', dialCode: '+421' },
  { code: 'EE', name: 'Estonia', dialCode: '+372' },
  { code: 'LV', name: 'Latvia', dialCode: '+371' },
  { code: 'LT', name: 'Lithuania', dialCode: '+370' },
  { code: 'BG', name: 'Bulgaria', dialCode: '+359' },
  { code: 'RO', name: 'Romania', dialCode: '+40' },
  { code: 'HR', name: 'Croatia', dialCode: '+385' },
  { code: 'JP', name: 'Japan', dialCode: '+81' },
  { code: 'KR', name: 'South Korea', dialCode: '+82' },
  { code: 'CN', name: 'China', dialCode: '+86' },
  { code: 'IN', name: 'India', dialCode: '+91' },
  { code: 'SG', name: 'Singapore', dialCode: '+65' },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60' },
  { code: 'TH', name: 'Thailand', dialCode: '+66' },
  { code: 'PH', name: 'Philippines', dialCode: '+63' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94' },
  { code: 'NP', name: 'Nepal', dialCode: '+977' },
  { code: 'MM', name: 'Myanmar', dialCode: '+95' },
  { code: 'KH', name: 'Cambodia', dialCode: '+855' },
  { code: 'LA', name: 'Laos', dialCode: '+856' },
  { code: 'BN', name: 'Brunei', dialCode: '+673' },
  { code: 'MN', name: 'Mongolia', dialCode: '+976' },
  { code: 'TW', name: 'Taiwan', dialCode: '+886' },
  { code: 'MO', name: 'Macau', dialCode: '+853' },
  { code: 'BR', name: 'Brazil', dialCode: '+55' },
  { code: 'MX', name: 'Mexico', dialCode: '+52' },
  { code: 'AR', name: 'Argentina', dialCode: '+54' },
  { code: 'CL', name: 'Chile', dialCode: '+56' },
  { code: 'CO', name: 'Colombia', dialCode: '+57' },
  { code: 'PE', name: 'Peru', dialCode: '+51' },
  { code: 'VE', name: 'Venezuela', dialCode: '+58' },
  { code: 'EC', name: 'Ecuador', dialCode: '+593' },
  { code: 'UY', name: 'Uruguay', dialCode: '+598' },
  { code: 'PY', name: 'Paraguay', dialCode: '+595' },
  { code: 'BO', name: 'Bolivia', dialCode: '+591' },
  { code: 'GY', name: 'Guyana', dialCode: '+592' },
  { code: 'SR', name: 'Suriname', dialCode: '+597' },
  { code: 'GF', name: 'French Guiana', dialCode: '+594' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27' },
  { code: 'EG', name: 'Egypt', dialCode: '+20' },
  { code: 'MA', name: 'Morocco', dialCode: '+212' },
  { code: 'DZ', name: 'Algeria', dialCode: '+213' },
  { code: 'TN', name: 'Tunisia', dialCode: '+216' },
  { code: 'LY', name: 'Libya', dialCode: '+218' },
  { code: 'SD', name: 'Sudan', dialCode: '+249' },
  { code: 'ET', name: 'Ethiopia', dialCode: '+251' },
  { code: 'KE', name: 'Kenya', dialCode: '+254' },
  { code: 'UG', name: 'Uganda', dialCode: '+256' },
  { code: 'TZ', name: 'Tanzania', dialCode: '+255' },
  { code: 'RW', name: 'Rwanda', dialCode: '+250' },
  { code: 'BI', name: 'Burundi', dialCode: '+257' },
  { code: 'DJ', name: 'Djibouti', dialCode: '+253' },
  { code: 'SO', name: 'Somalia', dialCode: '+252' },
  { code: 'ER', name: 'Eritrea', dialCode: '+291' },
  { code: 'SS', name: 'South Sudan', dialCode: '+211' },
  { code: 'CF', name: 'Central African Republic', dialCode: '+236' },
  { code: 'TD', name: 'Chad', dialCode: '+235' },
  { code: 'CM', name: 'Cameroon', dialCode: '+237' },
  { code: 'GQ', name: 'Equatorial Guinea', dialCode: '+240' },
  { code: 'GA', name: 'Gabon', dialCode: '+241' },
  { code: 'CG', name: 'Republic of the Congo', dialCode: '+242' },
  { code: 'CD', name: 'Democratic Republic of the Congo', dialCode: '+243' },
  { code: 'AO', name: 'Angola', dialCode: '+244' },
  { code: 'ZM', name: 'Zambia', dialCode: '+260' },
  { code: 'ZW', name: 'Zimbabwe', dialCode: '+263' },
  { code: 'BW', name: 'Botswana', dialCode: '+267' },
  { code: 'NA', name: 'Namibia', dialCode: '+264' },
  { code: 'LS', name: 'Lesotho', dialCode: '+266' },
  { code: 'SZ', name: 'Eswatini', dialCode: '+268' },
  { code: 'MW', name: 'Malawi', dialCode: '+265' },
  { code: 'MZ', name: 'Mozambique', dialCode: '+258' },
  { code: 'MG', name: 'Madagascar', dialCode: '+261' },
  { code: 'MU', name: 'Mauritius', dialCode: '+230' },
  { code: 'SC', name: 'Seychelles', dialCode: '+248' },
  { code: 'KM', name: 'Comoros', dialCode: '+269' },
  { code: 'YT', name: 'Mayotte', dialCode: '+262' },
  { code: 'RE', name: 'Réunion', dialCode: '+262' }
];

interface CountrySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onValueChange,
  placeholder = "Select country"
}) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {countries.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            <div className="flex items-center gap-2">
              <span>{country.name}</span>
              <span className="text-gray-500">({country.dialCode})</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
