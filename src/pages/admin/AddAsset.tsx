import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminSupabase } from '../../lib/supabase';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { NewDebtAsset, UploadedFile } from '../../types/asset';
import { PhotoIcon, DocumentIcon } from '@heroicons/react/24/outline';

export const AddAsset: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ assetId: string; name: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  const [formData, setFormData] = useState<NewDebtAsset>({
    name: '',
    symbol: '',
    description: '',
    main_image: '',
    price_per_token: 1,
    token_supply: 0,
    min_investment: 1000,
    max_investment: 0,
    address: '',
    city: '',
    state: '',
    zip_code: '',
    loan_amount: 0,
    term_months: 12,
    apr: 0,
    appraised_value: 0,
    loan_maturity_date: new Date(),
    images: [],
    documents: []
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let parsedValue: any = value;

    // Parse numeric fields
    if (['price_per_token', 'token_supply', 'min_investment', 'max_investment', 
         'loan_amount', 'apr', 'appraised_value'].includes(name)) {
      parsedValue = parseFloat(value) || 0;
    }
    
    // Parse date fields
    if (['loan_maturity_date'].includes(name)) {
      parsedValue = new Date(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };

  const handleFileUpload = async (files: FileList, type: 'images' | 'documents' | 'main_image') => {
    try {
      setUploadProgress(0);
      setError(null);

      // Check if user is authenticated
      const { data: { user }, error: authError } = await adminSupabase.auth.getUser();
      if (authError || !user) {
        throw new Error('You must be authenticated to upload files');
      }

      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('File size must be less than 5MB');
        }

        const fileExt = file.name.split('.').pop()?.toLowerCase();
        // Validate file extension
        if (type === 'images' || type === 'main_image') {
          if (!['jpg', 'jpeg', 'png', 'gif'].includes(fileExt || '')) {
            throw new Error('Please upload only jpg, jpeg, png, or gif files');
          }
        }

        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${type}/${fileName}`;

        console.log('Uploading file:', {
          name: file.name,
          type: file.type,
          size: file.size,
          path: filePath
        });

        const { error: uploadError, data: uploadData } = await adminSupabase.storage
          .from('assets')
          .upload(filePath, file, {
            upsert: true,
            cacheControl: '3600'
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        console.log('Upload successful:', uploadData);

        // Get the public URL
        const { data: publicUrlData } = adminSupabase.storage
          .from('assets')
          .getPublicUrl(filePath);

        if (!publicUrlData?.publicUrl) {
          throw new Error('Failed to generate public URL for uploaded file');
        }

        console.log('Generated public URL:', publicUrlData.publicUrl);

        setUploadProgress((prev) => prev + (100 / files.length));

        return {
          url: publicUrlData.publicUrl,
          name: file.name,
          type: file.type,
          path: filePath
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setUploadProgress(100);

      if (type === 'main_image') {
        if (!uploadedFiles[0]?.url) {
          throw new Error('Failed to get URL for main image');
        }
        setFormData(prev => ({
          ...prev,
          main_image: uploadedFiles[0].url
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [type]: [...prev[type], ...uploadedFiles]
        }));
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload files');
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if symbol already exists
      const { data: existingAsset, error: checkError } = await adminSupabase
        .from('assets')
        .select('symbol')
        .eq('symbol', formData.symbol.toUpperCase())
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means not found, which is what we want
        throw checkError;
      }

      if (existingAsset) {
        throw new Error(`Asset symbol "${formData.symbol}" is already in use. Please choose a different symbol.`);
      }

      // Calculate token supply based on loan amount
      const tokenSupply = formData.loan_amount * 100; // 100 tokens per dollar
      const pricePerToken = formData.loan_amount / tokenSupply;
      
      // Insert into assets table
      const { data: assetData, error: assetError } = await adminSupabase
        .from('assets')
        .insert({
          name: formData.name,
          symbol: formData.symbol.toUpperCase(), // Ensure symbol is uppercase
          type: 'debt',
          description: formData.description,
          main_image: formData.main_image,
          price_per_token: pricePerToken,
          token_supply: tokenSupply,
          min_investment: formData.min_investment,
          max_investment: formData.max_investment,
          created_by: (await adminSupabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (assetError) throw assetError;

      // Insert into debt_assets table
      const { error: debtError } = await adminSupabase
        .from('debt_assets')
        .insert({
          asset_id: assetData.id,
          apr: formData.apr,
          term_months: formData.term_months,
          loan_amount: formData.loan_amount,
          status: 'FUNDING',
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
          appraised_value: formData.appraised_value,
          loan_maturity_date: formData.loan_maturity_date,
          images: formData.images,
          documents: formData.documents
        });

      if (debtError) {
        console.error('Debt asset error:', debtError);
        throw new Error(`Failed to create debt asset: ${debtError.message}`);
      }

      // Set success state instead of navigating
      setSuccess({ assetId: assetData.id, name: assetData.name });
      setFormData({
        name: '',
        symbol: '',
        description: '',
        main_image: '',
        price_per_token: 1,
        token_supply: 0,
        min_investment: 1000,
        max_investment: 0,
        address: '',
        city: '',
        state: '',
        zip_code: '',
        loan_amount: 0,
        term_months: 12,
        apr: 0,
        appraised_value: 0,
        loan_maturity_date: new Date(),
        images: [],
        documents: []
      }); // Reset form
    } catch (err) {
      console.error('Error creating asset:', err);
      setError(err instanceof Error ? err.message : 'Failed to create asset');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-green-700 mb-4">
            Asset Created Successfully!
          </h2>
          <p className="text-green-600 mb-6">
            {success.name} has been added to the platform and is ready for funding.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => navigate(`/admin/assets/${success.assetId}`)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              View Asset
            </button>
            <button
              onClick={() => {
                setSuccess(null);
                setFormData({
                  name: '',
                  symbol: '',
                  description: '',
                  main_image: '',
                  price_per_token: 1,
                  token_supply: 0,
                  min_investment: 1000,
                  max_investment: 0,
                  address: '',
                  city: '',
                  state: '',
                  zip_code: '',
                  loan_amount: 0,
                  term_months: 12,
                  apr: 0,
                  appraised_value: 0,
                  loan_maturity_date: new Date(),
                  images: [],
                  documents: []
                });
              }}
              className="bg-white text-green-600 border border-green-600 px-6 py-2 rounded-lg hover:bg-green-50 transition-colors"
            >
              Add Another Asset
            </button>
            <button
              onClick={() => navigate('/admin/assets')}
              className="bg-gray-100 text-gray-600 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Return to Assets
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-light mb-8">Add New Debt Asset</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-dark-2 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-light mb-4">Basic Information</h2>
          
          <Input
            label="Asset Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <Input
            label="Symbol"
            name="symbol"
            value={formData.symbol}
            onChange={handleChange}
            required
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-light">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 bg-dark-3 border border-dark-4 rounded-lg text-light focus:ring-1 focus:ring-primary"
              required
            />
          </div>
        </div>

        {/* Property Details */}
        <div className="bg-dark-2 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-light mb-4">Property Details</h2>
          
          <Input
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
            />

            <Input
              label="State"
              name="state"
              value={formData.state}
              onChange={handleChange}
              required
            />

            <Input
              label="ZIP Code"
              name="zip_code"
              value={formData.zip_code}
              onChange={handleChange}
              required
            />
          </div>

          <Input
            label="Appraised Value"
            name="appraised_value"
            type="number"
            value={formData.appraised_value}
            onChange={handleChange}
            required
          />
        </div>

        {/* Loan Details */}
        <div className="bg-dark-2 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-light mb-4">Loan Details</h2>
          
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-light">Loan Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Loan Amount"
                name="loan_amount"
                type="number"
                value={formData.loan_amount}
                onChange={handleChange}
                required
              />
              <Input
                label="APR (%)"
                name="apr"
                type="number"
                step="0.1"
                value={formData.apr}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Term (Months)"
                name="term_months"
                type="number"
                value={formData.term_months}
                onChange={handleChange}
                required
              />
              <Input
                label="Appraised Value"
                name="appraised_value"
                type="number"
                value={formData.appraised_value}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Loan Maturity Date"
                name="loan_maturity_date"
                type="date"
                value={formData.loan_maturity_date.toISOString().split('T')[0]}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>

        {/* Investment Details */}
        <div className="bg-dark-2 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-light mb-4">Investment Details</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Minimum Investment"
              name="min_investment"
              type="number"
              value={formData.min_investment}
              onChange={handleChange}
              required
            />

            <Input
              label="Maximum Investment"
              name="max_investment"
              type="number"
              value={formData.max_investment}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Files */}
        <div className="bg-dark-2 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-light mb-4">Files</h2>
          
          {/* Main Image */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-light">
              Main Image
            </label>
            <div className="flex items-center space-x-4">
              {formData.main_image ? (
                <img 
                  src={formData.main_image} 
                  alt="Main" 
                  className="w-24 h-24 object-cover rounded-lg"
                />
              ) : (
                <div className="w-24 h-24 border-2 border-dashed border-dark-4 rounded-lg flex items-center justify-center">
                  <PhotoIcon className="w-8 h-8 text-dark-4" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'main_image')}
                className="block w-full text-sm text-light file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-dark-3 file:text-light hover:file:bg-dark-4"
              />
            </div>
          </div>

          {/* Additional Images */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-light">
              Additional Images
            </label>
            <div className="flex flex-wrap gap-4">
              {formData.images.map((image, index) => (
                <img 
                  key={index}
                  src={image.url} 
                  alt={`Additional ${index + 1}`}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              ))}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'images')}
                className="block w-full text-sm text-light file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-dark-3 file:text-light hover:file:bg-dark-4"
              />
            </div>
          </div>

          {/* Documents */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-light">
              Documents
            </label>
            <div className="space-y-2">
              {formData.documents.map((doc, index) => (
                <div key={index} className="flex items-center space-x-2 text-light">
                  <DocumentIcon className="w-5 h-5" />
                  <span>{doc.name}</span>
                </div>
              ))}
              <input
                type="file"
                multiple
                onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'documents')}
                className="block w-full text-sm text-light file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-dark-3 file:text-light hover:file:bg-dark-4"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/admin/assets')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            Create Asset
          </Button>
        </div>
      </form>
    </div>
  );
}; 