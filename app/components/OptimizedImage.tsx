import { useState } from 'react';
import Image from 'next/image';
import classNames from 'classnames';

interface OptimizedImageProps {
    src: string;
    alt: string;
    className?: string;
    priority?: boolean;
    unoptimized?: boolean;
    height?: string;
}

export function OptimizedImage({ 
    src, 
    alt, 
    className,
    priority = false,
    unoptimized = false,
    height = '100%'
}: OptimizedImageProps) {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className={classNames(
            'relative w-full overflow-hidden rounded-sm',
            className
        )}
        style={{ height }}>
            {/* Blur placeholder */}
            {isLoading && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            
            <Image
                src={src}
                alt={alt}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className={classNames(
                    'object-cover transition-opacity duration-300',
                    isLoading ? 'opacity-0' : 'opacity-100'
                )}
                priority={priority}
                loading={priority ? 'eager' : 'lazy'}
                onLoad={() => setIsLoading(false)}
                quality={75}
                unoptimized={unoptimized}
            />
        </div>
    );
} 