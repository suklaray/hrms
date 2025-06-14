import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const Footer = () => {
  return (
    <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white w-full">
      <footer className="px-6 py-6">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center">
            <Image src="/logo.jpg" alt="HRMS Logo" width={32} height={32} />
            <span className="ml-3 text-xl font-semibold">HRMS</span>
          </div>
          <p className="text-sm mt-4 sm:mt-0">
            © 2025 HRMS — 
            <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-amber-300 ml-1 hover:underline">
              @HRMS
            </Link>
          </p>  
          <div className="flex space-x-4 mt-4 sm:mt-0">
            {["facebook", "twitter", "instagram", "linkedin"].map((icon) => (
              <Link key={icon} className="hover:text-amber-300" href="#">
                <i className={`fab fa-${icon} text-xl`}></i>
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
