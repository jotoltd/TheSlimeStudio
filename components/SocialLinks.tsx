type SocialIconProps = {
  size?: number;
  className?: string;
};

export function InstagramIcon({ size = 20, className = "" }: SocialIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.5" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function TikTokIcon({ size = 20, className = "" }: SocialIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16.5 3c.3 2.1 1.5 3.6 3.5 3.9v2.4c-1.2.1-2.4-.2-3.5-.8v5.8c0 3.2-2.3 5.7-5.3 5.7s-5.3-2.5-5.3-5.7c0-3.1 2.3-5.6 5.2-5.6v2.5c-1.5.2-2.7 1.5-2.7 3.1s1.2 3.2 2.8 3.2 2.8-1.4 2.8-3.2V3h2.5z"
        fill="currentColor"
      />
    </svg>
  );
}

export function FacebookIcon({ size = 20, className = "" }: SocialIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 8.5V7c0-.7.5-1 1.2-1H17V3.2h-2.8C11.8 3.2 11 5 11 7v1.5H9v2.8h2V21h3v-9.7h2.2l.4-2.8H14z"
        fill="currentColor"
      />
    </svg>
  );
}

type SocialLinksProps = {
  size?: number;
  className?: string;
  linkClassName?: string;
};

export default function SocialLinks({ size = 20, className = "", linkClassName = "" }: SocialLinksProps) {
  return (
    <div className={`flex gap-3 ${className}`}>
      <a
        href="https://instagram.com/theslimestudioexperience"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
        className={`w-[38px] h-[38px] rounded-full bg-ink/8 grid place-items-center text-ink hover:bg-ink/15 hover:scale-110 transition-all ${linkClassName}`}
      >
        <InstagramIcon size={size} />
      </a>
      <a
        href="https://tiktok.com/@theslimestudioexperience"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="TikTok"
        className={`w-[38px] h-[38px] rounded-full bg-ink/8 grid place-items-center text-ink hover:bg-ink/15 hover:scale-110 transition-all ${linkClassName}`}
      >
        <TikTokIcon size={size} />
      </a>
      <a
        href="https://facebook.com/theslimestudioexperience"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Facebook"
        className={`w-[38px] h-[38px] rounded-full bg-ink/8 grid place-items-center text-ink hover:bg-ink/15 hover:scale-110 transition-all ${linkClassName}`}
      >
        <FacebookIcon size={size} />
      </a>
    </div>
  );
}
