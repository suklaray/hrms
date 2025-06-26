import Image from "next/image";
import { useState, useRef } from "react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef(null);
  const handleSubmit = (e) => {
    e.preventDefault();
    formRef.current.reset()
    setSubmitted(true); 
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-300 to-indigo-300 p-6 text-white">
      
      {/* Card Container */}
      <div className="bg-gray-100 bg-opacity-10 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-6xl w-full flex flex-col md:flex-row gap-8">
        
        {/* Left Side: Image */}
        <div className="p-8 flex justify-center items-center md:w-1/2">
          <Image
            src="/employee.svg"
            alt="Contact Illustration"
            width={400}
            height={400}
            className="rounded-lg"
          />          
        </div>

        {/* Right Side: Form */}
        <form className="md:w-1/2 space-y-5" ref={formRef} onSubmit={handleSubmit}>
          <h2 className="text-3xl pb-1 pt-3 font-bold text-indigo-600 text-center">CONTACT US</h2>
          <p className="text-indigo-600 text-center pb-5">
            We&rsquo;d love to hear from you! Whether you have a question or just want to say hello, our team is ready to assist you.
          </p>
          
          {/* Inputs */}
          <input
            type="text"
            placeholder="Your Name"
            className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-80 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="email"
            placeholder="Your Email"
            className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-80 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="text"
            placeholder="Subject"
            className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-80 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <textarea
            rows="4"
            placeholder="Your Message"
            className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-80 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          ></textarea>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl transition duration-300"
          >
            Send Message
          </button>
          {submitted && (
        <p className=" text-green-600 text-center font-semibold">
          Thank you! Submitted successfully.
        </p>)}
        </form>
        
      </div>
    </div>
  );
}
