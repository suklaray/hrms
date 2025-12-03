import { useState, useRef } from "react";
import Head from 'next/head';
import { Mail, Phone, MapPin, Send, MessageCircle } from "lucide-react";
import {toast} from "react-toastify";
export default function ContactPage() {
  const formRef = useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const isFormValid = Object.values(formData).every((field) => field.trim() !== "");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormErrors({ ...formErrors, [e.target.name]: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setFormErrors(data.errors);
        } else {
          toast.error(data.error || "Unknown error occurred.");
        }
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      formRef.current?.reset();
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      toast.error("Network error. Please try again.");
    }

    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>Contact Us - HRMS</title>
      </Head>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Animated Background Shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-100 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-4000"></div>
        <div className="absolute bottom-40 right-40 w-60 h-60 bg-indigo-100 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-6000"></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-gray-300 rounded-full opacity-30 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-800 mb-4">
              Get In <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Touch</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Ready to transform your HR management? Let&apos;s start the conversation.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Contact Info */}
            <div className="space-y-8 animate-fade-in-left">
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border border-gray-200 hover:bg-white/90 transition-all duration-300 transform hover:scale-105 shadow-lg">
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Let&apos;s Connect</h2>
                <p className="text-gray-600 mb-8 text-lg">
                  We&apos;re here to help you streamline your HR processes and boost productivity.
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-center space-x-4 group">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-800 font-semibold">Email Us</p>
                      <a href="mailto:info@raysoftwareservice.com" className="text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                        info@raysoftwareservice.com
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 group">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-800 font-semibold">Call Us</p>
                      <a href="tel:+15551234567" className="text-green-600 hover:text-green-800 hover:underline transition-colors">
                        +1 (555) 123-4567
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 group">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-800 font-semibold">Visit Us</p>
                      <a href="https://maps.google.com/?q=123+Business+Ave,+Tech+City" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 hover:underline transition-colors">
                        123 Business Ave, Tech City
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="animate-fade-in-right">
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border border-gray-200 hover:bg-white/90 transition-all duration-300 shadow-lg">
                <div className="flex items-center justify-center mb-6">
                  <MessageCircle className="w-8 h-8 text-blue-500 mr-3" />
                  <h2 className="text-2xl font-bold text-gray-800">Send Message</h2>
                </div>
                
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                  {["name", "email", "subject"].map((field) => (
                    <div key={field} className="group">
                      <input
                        name={field}
                        type={field === "email" ? "email" : "text"}
                        placeholder={`Your ${field.charAt(0).toUpperCase() + field.slice(1)} *`}
                        value={formData[field]}
                        onChange={handleChange}
                        className="w-full px-6 py-4 rounded-2xl bg-white/70 border border-gray-300 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all duration-300 group-hover:bg-white shadow-sm"
                      />
                      {formErrors[field] && (
                        <p className="text-red-600 text-sm mt-2 animate-shake">{formErrors[field]}</p>
                      )}
                    </div>
                  ))}
                  
                  <div className="group">
                    <textarea
                      name="message"
                      rows="5"
                      placeholder="Your Message *"
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-6 py-4 rounded-2xl bg-white/70 border border-gray-300 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all duration-300 group-hover:bg-white resize-none shadow-sm"
                    ></textarea>
                    {formErrors.message && (
                      <p className="text-red-600 text-sm mt-2 animate-shake">{formErrors.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!isFormValid || loading}
                    className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 ${
                      !isFormValid || loading
                        ? "bg-gray-500 cursor-not-allowed opacity-50"
                        : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl"
                    }`}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>

                  {submitted && (
                    <div className="text-center p-4 bg-green-100 border border-green-300 rounded-2xl animate-bounce">
                      <p className="text-green-700 font-semibold">✨ Message sent successfully!</p>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-left {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in-right {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .animation-delay-6000 { animation-delay: 6s; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out; }
        .animate-fade-in-left { animation: fade-in-left 0.8s ease-out 0.2s both; }
        .animate-fade-in-right { animation: fade-in-right 0.8s ease-out 0.4s both; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
    </>
  );
}