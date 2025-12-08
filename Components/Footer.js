import React from 'react';
import Link from 'next/link';
import { Building2, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl group-hover:from-blue-700 group-hover:to-purple-700 transition-all duration-300">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                HRMS
              </span>
            </Link>
            <p className="text-gray-300 text-sm leading-relaxed">
              Streamline your HR operations with our modern Human Resource Management System. 
              Efficient, secure, and user-friendly.
            </p>
            <div className="flex space-x-4">
              {[
                { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
                { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
                { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
                { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" }
              ].map(({ icon: Icon, href, label }) => (
                <Link
                  key={label}
                  href={href}
                  target='_blank'
                  className="p-2 bg-gray-800 hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 rounded-lg transition-all duration-300 group"
                  aria-label={label}
                >
                  <Icon className="w-5 h-5 text-gray-400 group-hover:text-white" />
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Quick Links</h3>
            <div className="space-y-2">
              {[
                { href: "/", label: "Home" },
                { href: "/AboutUs", label: "About Us" },
                { href: "/Contact", label: "Contact" },
                { href: "/login", label: "Admin Login" },
                { href: "/employee/login", label: "Employee Login" }
              ].map(({ href, label }) => (
                <Link
                  key={label}
                  href={href}
                  className="block text-gray-300 hover:text-blue-400 transition-colors duration-200 text-sm"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Services</h3>
            <div className="space-y-2">
              {[
                "Employee Management",
                "Recruitment System",
                "Performance Analytics",
                "Leave Management",
                "Payroll Processing"
              ].map((service) => (
                <div key={service} className="text-gray-300 text-sm">
                  {service}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Contact Info</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-gray-300 text-sm">
                <Mail className="w-4 h-4 text-blue-400" />
                <span>info@hrms.com</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300 text-sm">
                <Phone className="w-4 h-4 text-blue-400" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-start space-x-3 text-gray-300 text-sm">
                <MapPin className="w-4 h-4 text-blue-400 mt-0.5" />
                <span>123 Business Ave<br />Suite 100<br />City, State 12345</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-12 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm">
              © 2025 HRMS. All rights reserved.
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <Link href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-200">
                Privacy Policy
              </Link>
              <Link href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-200">
                Terms of Service
              </Link>
              <Link href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-200">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;