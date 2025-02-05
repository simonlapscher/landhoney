import { countries as countriesList } from 'countries-list';

export type Country = {
  code: string;
  name: string;
};

// Convert the countries-list format to our format
export const countries: Country[] = Object.entries(countriesList).map(([code, data]) => ({
  code,
  name: data.name,
})).sort((a, b) => a.name.localeCompare(b.name)); 