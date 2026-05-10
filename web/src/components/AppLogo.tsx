import Image from 'next/image';

export interface AppLogoProps {
  /** Pass-through for next/image `sizes` (width hint when using fill). */
  sizes?: string;
  className?: string;
  priority?: boolean;
}

/**
 * App branding mark; image lives at `/public/logo.png`.
 * Render inside a parent with `position: relative` and explicit width/height — the image fills it with no inset (object-cover).
 */
export function AppLogo({ sizes = '64px', className, priority }: AppLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt=""
      fill
      sizes={sizes}
      /** HQ asset: skip Next resize/WebP pipeline so the source PNG is not softened or shrunk. */
      unoptimized
      className={className ? `object-cover ${className}`.trim() : 'object-cover'}
      priority={priority}
      aria-hidden
    />
  );
}
