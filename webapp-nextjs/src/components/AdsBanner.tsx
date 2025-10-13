import React from 'react';
import Image from 'next/image';

export const AdsBanner: React.FC = () => {
  return (
    <div className="mb-3 mx-4 relative overflow-hidden rounded-xl">
      <Image
        src="/adno1.png"
        alt="Advertisement"
        width={400}
        height={120}
        className="w-full h-auto rounded-xl"
        priority
      />
    </div>
  );
};
