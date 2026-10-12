import React from 'react';
import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * LoadingIndicator component
 * Displays a centered loading spinner with optional text
 *
 * @param {Object} props - Component props
 * @param {string} props.text - Text to display below the spinner
 * @param {number} props.size - Size of the spinner
 * @param {number} props.minHeight - Minimum height of the container
 * @param {Object} props.sx - Additional styling for the container
 * @returns {JSX.Element}
 */
const LoadingIndicator = ({
  text,
  size = 40,
  minHeight = 400,
  sx = {},
}) => {
  return (
    <div
      className="flex flex-col justify-center items-center p-6"
      style={{ minHeight, ...sx }}
    >
      <Loader2
        className={cn('animate-spin text-primary', text ? 'mb-4' : '')}
        style={{ width: size, height: size }}
      />

      {text && (
        <p className="text-sm text-muted-foreground text-center">{text}</p>
      )}
    </div>
  );
};

LoadingIndicator.propTypes = {
  text: PropTypes.string,
  size: PropTypes.number,
  minHeight: PropTypes.number,
  sx: PropTypes.object,
};

export default LoadingIndicator;
