import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { styles } from '../../utils/styles';
import { GlobeAltIcon, MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Input } from '../common/Input';
import { countries } from 'countries-list';
import { supabase } from '../../lib/supabase';

const ALL_COUNTRIES = Object.entries(countries).map(([code, country]) => ({
  value: code.toLowerCase(),
  label: country.name,
})).sort((a, b) => a.label.localeCompare(b.label));

export const CountrySelection: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCountryLabel = ALL_COUNTRIES.find(c => c.value === selectedCountry)?.label;

  const filteredCountries = useMemo(() => {
    return ALL_COUNTRIES.filter(country => 
      country.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (inputRef.current?.contains(target)) {
        setIsOpen(true);
        return;
      }
      if (!dropdownRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ country: selectedCountry })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      navigate('/onboarding/phone');
    } catch (error) {
      console.error('Error saving country selection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCountrySelect = (country: { value: string; label: string }) => {
    setSelectedCountry(country.value);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleInputClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(prev => !prev);
  };

  return (
    <div className={`${styles.container} space-y-6`}>
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <GlobeAltIcon className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-light">Select Your Country</h2>
        <p className="text-light/80 mt-2">
          Choose your country of residence
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative" ref={dropdownRef}>
          <div
            className="relative cursor-pointer"
            onClick={handleInputClick}
          >
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-light/50" />
            </div>
            <Input
              ref={inputRef}
              type="text"
              value={isOpen ? searchQuery : selectedCountryLabel || ''}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              placeholder="Search countries..."
              className="pl-10 pr-10 cursor-pointer"
            />
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <ChevronDownIcon className={`h-5 w-5 text-light/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {isOpen && (
            <div className="absolute z-50 mt-1 w-full rounded-xl bg-[#171717]">
              <div 
                className="max-h-60 overflow-y-auto rounded-xl divide-y divide-dark-600
                  scrollbar scrollbar-thin scrollbar-thumb-primary scrollbar-track-dark-700
                  bg-[#171717]"
              >
                {filteredCountries.length === 0 ? (
                  <div className="px-4 py-3 text-light/50 text-center bg-[#171717]">
                    No countries found
                  </div>
                ) : (
                  filteredCountries.map((country) => (
                    <button
                      key={country.value}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className={`w-full px-4 py-3 text-left transition-colors
                        ${selectedCountry === country.value 
                          ? 'bg-primary/20 text-primary' 
                          : 'text-light/80 hover:bg-dark-700'}
                        bg-[#171717]`}
                    >
                      {country.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
          disabled={!selectedCountry}
        >
          Continue
        </Button>
      </form>
    </div>
  );
}; 