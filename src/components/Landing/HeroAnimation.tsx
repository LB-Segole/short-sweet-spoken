import { useState, useEffect } from 'react';

const HeroAnimation = () => {
  const [index, setIndex] = useState(0);
  const phrases = [
    "Automate Customer Service",
    "Generate More Leads",
    "Scale Your Business",
    "Improve Customer Engagement"
  ];

  useEffect(() => {
    const intervalId = setInterval(() => {
      setIndex(prevIndex => (prevIndex + 1) % phrases.length);
    }, 3000); // Change phrase every 3 seconds

    return () => clearInterval(intervalId); // Clear interval on unmount
  }, [phrases.length]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20 rounded-full blur-3xl"></div>
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white z-10">
        {phrases[index]}
      </h2>
    </div>
  );
};

export default HeroAnimation;
