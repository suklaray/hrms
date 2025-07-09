import { useState, useRef } from "react";
import Image from "next/image";

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
          console.warn("Field errors:", data.errors);
        } else {
          alert(data.error || "Unknown error occurred.");
          console.error("General error:", data.error);
        }
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      formRef.current?.reset();
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      console.error("Frontend submit error:", err);
      alert("Network error. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-300 to-indigo-300 p-6 text-white">
      <div className="bg-gray-100 bg-opacity-10 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-6xl w-full flex flex-col md:flex-row gap-8">
        <div className="p-8 flex justify-center items-center md:w-1/2">
          <Image src="/images/employee.svg" alt="Contact Illustration" width={400} height={400} className="rounded-lg" />
        </div>

        <form className="md:w-1/2 space-y-5" ref={formRef} onSubmit={handleSubmit}>
          <h2 className="text-3xl pb-1 pt-3 font-bold text-indigo-600 text-center">CONTACT US</h2>
          <p className="text-indigo-600 text-center pb-5">
            We’d love to hear from you! Whether you have a question or just want to say hello, our team is ready to assist you.
          </p>

          {["name", "email", "subject", "message"].map((field) =>
            field === "message" ? (
              <div key={field}>
                <textarea
                  name={field}
                  rows="4"
                  placeholder="Your Message"
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-80 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                ></textarea>
                {formErrors.message && <p className="text-red-500 text-sm">{formErrors.message}</p>}
              </div>
            ) : (
              <div key={field}>
                <input
                  name={field}
                  type={field === "email" ? "email" : "text"}
                  placeholder={`Your ${field.charAt(0).toUpperCase() + field.slice(1)}`}
                  value={formData[field]}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-80 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {formErrors[field] && <p className="text-red-500 text-sm">{formErrors[field]}</p>}
              </div>
            )
          )}

          <button
            type="submit"
            disabled={!isFormValid || loading}
            className={`w-full font-bold py-3 rounded-xl transition duration-300 ${
              !isFormValid || loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            }`}
          >
            {loading ? "Sending..." : "Send Message"}
          </button>

          {submitted && <p className="text-green-500 text-center font-semibold"> Message sent successfully!</p>}
        </form>
      </div>
    </div>
  );
}
