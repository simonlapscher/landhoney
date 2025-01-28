import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface ImageGalleryProps {
  images: string[];
  alt: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, alt }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="relative">
      <div className={`relative ${isExpanded ? 'fixed inset-0 z-50 bg-dark' : ''}`}>
        <img
          src={images[currentIndex]}
          alt={`${alt} - Image ${currentIndex + 1}`}
          className={`w-full object-cover ${
            isExpanded
              ? 'h-screen object-contain p-4'
              : 'h-[400px] rounded-lg cursor-pointer'
          }`}
          onClick={toggleExpanded}
        />
        
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-dark/80 text-light hover:bg-dark/60 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-dark/80 text-light hover:bg-dark/60 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
            >
              <ChevronRightIcon className="h-6 w-6" />
            </button>
          </>
        )}

        {/* View all photos button */}
        <button
          className="absolute top-4 right-4 flex items-center space-x-2 bg-light text-dark px-4 py-2 rounded-lg hover:bg-light/90 transition-colors"
          onClick={toggleExpanded}
        >
          <PhotoIcon className="h-5 w-5" />
          <span className="font-medium">
            {isExpanded ? 'Close' : 'View all photos'}
          </span>
        </button>

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-4 bg-dark/80 text-light px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
}; 