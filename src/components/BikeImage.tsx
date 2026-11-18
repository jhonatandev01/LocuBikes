import { useState } from 'react';
import { Bike as BikeIcon } from 'lucide-react';

interface BikeImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectClass?: string;
}

export function BikeImage({
  src,
  alt,
  className = '',
  aspectClass = 'aspect-[4/3]',
}: BikeImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`${aspectClass} w-full bg-zinc-100 dark:bg-zinc-800 flex flex-col items-center justify-center gap-2 text-zinc-400 dark:text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 ${className}`}
        role="img"
        aria-label={alt}
      >
        <BikeIcon className="w-8 h-8 stroke-[1.5]" aria-hidden="true" />
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-4 text-center truncate max-w-full">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className={`${aspectClass} w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${className}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
      />
    </div>
  );
}
