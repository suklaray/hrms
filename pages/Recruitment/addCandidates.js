import { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import SideBar from "@/Components/SideBar";
import { UserIcon, MailIcon, PhoneIcon, CalendarIcon, UploadIcon } from "lucide-react";

export default function AddCandidate() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contact_number: "",
    interviewDate: "",
    cv: null,
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""); // To handle error messages

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "cv") {
      setFormData({ ...formData, cv: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(""); // Reset error message on form submission

    const data = new FormData();
    data.append("name", formData.name);
    data.append("email", formData.email);
    data.append("contact_number", formData.contact_number);
    data.append("interviewDate", formData.interviewDate);
    data.append("cv", formData.cv);

    try {
      // Send the form data to the backend
      await axios.post("/api/recruitment/addCandidate", data);

      // If successful, show a success message and redirect
      alert("Candidate added successfully!");
      router.push("/Recruitment/recruitment");
    } catch (error) {
      // Check if the error is related to the email already existing
      if (error.response && error.response.data.error === "Email already exists") {
        setErrorMessage("The email address is already registered. Please use a different one.");
      } else if (error.response) {
        // If there is another error, show a generic error message
        setErrorMessage("Failed to add candidate. Please try again.");
      }

      // Optional: Only log the error to the console if it's not a 400 error (email already exists)
      if (!(error.response && error.response.status === 400)) {
        console.error("Error submitting form:", error);
      }
    } finally {
      setLoading(false);
    }
};


  return (
    <div className="flex">
      <SideBar />
      <div className="p-6 w-full min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl p-10 mt-10 animate-fade-in">
          <h1 className="text-4xl font-bold text-center text-indigo-700 mb-10">Add New Candidate</h1>

          {/* Error message */}
          {errorMessage && (
            <div className="mb-4 text-red-500 text-center">
              <p>{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-6">
            {/* Name */}
            <div>
              <label className=" text-sm font-semibold text-gray-700 flex items-center gap-2">
                <UserIcon className="w-4 h-4" /> Name
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
              />
            </div>

            {/* Email */}
            <div>
              <label className=" text-sm font-semibold text-gray-700 flex items-center gap-2">
                <MailIcon className="w-4 h-4" /> Email
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
              />
            </div>

            {/* Contact Number */}
            <div>
              <label className=" text-sm font-semibold text-gray-700 flex items-center gap-2">
                <PhoneIcon className="w-4 h-4" /> Contact Number
              </label>
              <input
                type="tel"
                name="contact_number"
                required
                pattern="[0-9]{10}"
                placeholder="9876543210"
                value={formData.contact_number}
                onChange={handleChange}
                className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
              />
            </div>

            {/* Interview Date */}
            <div>
              <label className=" text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" /> Interview Date
              </label>
              <input
                type="date"
                name="interviewDate"
                required
                value={formData.interviewDate}
                onChange={handleChange}
                className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
              />
            </div>

            {/* CV Upload */}
            <div>
              <label className=" text-sm font-semibold text-gray-700 flex items-center gap-2">
                <UploadIcon className="w-4 h-4" /> Upload CV
              </label>
              <input
                type="file"
                name="cv"
                required
                accept=".pdf,.doc,.docx"
                onChange={handleChange}
                className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-2 bg-white focus:outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] transition-transform duration-200 ease-in-out disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Candidate"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
