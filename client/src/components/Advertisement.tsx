
import { useEffect } from 'react';

interface AdProps {
  slot: string;
  format?: 'auto' | 'rectangle' | 'horizontal';
}

export function Advertisement({ slot, format = 'auto' }: AdProps) {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error('Error loading advertisement:', error);
    }
  }, []);

  return (
    <div className="ad-container my-4">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="YOUR-AD-CLIENT-ID" // Заменете с вашето AD CLIENT ID
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
