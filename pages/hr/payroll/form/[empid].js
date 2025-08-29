import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import SideBar from "@/Components/SideBar";
import { User, Mail, Phone, Calendar, DollarSign, Plus, Minus, Calculator, CheckCircle, ArrowLeft, Eye, XCircle } from 'lucide-react';

export default function PayrollForm() {
  const router = useRouter();
  const { empid } = router.query;
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [employeeData, setEmployeeData] = useState(null);
  const [formData, setFormData] = useState({
    basic_salary: '',
    hra_percent: 40,
    da_percent: 10,
    allowances: [{ name: '', percent: 20, include: true }],
    deductions: [{ name: '', percent: 5, include: true }],
    bonus: '',
    month: '',
    year: new Date().getFullYear(),
    hra_include: true,
    da_include: true,
    pf_percent: 10,
    ptax_percent: 200,
    esic_percent: 0.75,
    pf_include: true,
    ptax_include: true,
    esic_include: true,
  });

  useEffect(() => {
    if (!empid) return;
    
    // Fetch employee data
    fetch(`/api/hr/employees/${empid}`)
      .then((res) => res.json())
      .then((data) => {
        setEmployee(data.employee);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching employee:', err);
        setLoading(false);
      });

    // Fetch previous payroll data to pre-fill form
    fetch(`/api/hr/payroll/get?empid=${empid}`)
      .then((res) => res.json())
      .then((payrolls) => {
        if (payrolls && payrolls.length > 0) {
          // Get the most recent payroll
          const lastPayroll = payrolls[payrolls.length - 1];
          
          // Pre-fill form with previous data
          setFormData(prev => ({
            ...prev,
            basic_salary: lastPayroll.basic_salary || '',
            bonus: lastPayroll.bonus || '',
            hra_percent: 40, // Keep default or calculate from last payroll
            da_percent: 10,
            pf_percent: 10,
            ptax_percent: 200,
            esic_percent: 0.75
          }));
        }
      })
      .catch((err) => {
        console.error('Error fetching previous payroll:', err);
      });
  }, [empid]);

  const calculateAmount = (percent) => {
    return ((formData.basic_salary || 0) * percent) / 100;
  };
  
  const handleChange = (e) => {
    const value = e.target.type === 'number' ? (e.target.value === '' ? '' : parseFloat(e.target.value)) : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleAllowanceChange = (index, e) => {
    const updatedAllowances = [...formData.allowances];
    if(e.target.name === 'percent'){
      updatedAllowances[index][e.target.name] = e.target.value === '' ? '' : parseFloat(e.target.value);
    } else {
      updatedAllowances[index][e.target.name] = e.target.value;
    }
    setFormData({ ...formData, allowances: updatedAllowances });
  };

  const handleDeductionChange = (index, e) => {
    const updatedDeductions = [...formData.deductions];
    if(e.target.name === 'percent'){
      updatedDeductions[index][e.target.name] = e.target.value === '' ? '' : parseFloat(e.target.value);
    } else {
      updatedDeductions[index][e.target.name] = e.target.value;
    }
    setFormData({ ...formData, deductions: updatedDeductions });
  };

  const handleAddAllowance = () => {
    setFormData({
      ...formData,
      allowances: [...formData.allowances, { name: '', percent: 0, include: true }],
    });
  };

  const handleAddDeduction = () => {
    setFormData({
      ...formData,
      deductions: [...formData.deductions, { name: '', percent: 0, include: true }],
    });
  };

  const handleRemoveAllowance = (index) => {
    const updatedAllowances = [...formData.allowances];
    updatedAllowances.splice(index, 1);
    setFormData({ ...formData, allowances: updatedAllowances });
  };

  const handleRemoveDeduction = (index) => {
    const updatedDeductions = [...formData.deductions];
    updatedDeductions.splice(index, 1);
    setFormData({ ...formData, deductions: updatedDeductions });
  };

  const calculateNetPay = () => {
    const hra = formData.hra_include ? calculateAmount(formData.hra_percent) : 0;
    const da = formData.da_include ? calculateAmount(formData.da_percent) : 0;
    const pf = formData.pf_include ? calculateAmount(formData.pf_percent) : 0;
    const ptax = formData.ptax_include ? 200 : 0;
    const esic = formData.esic_include ? calculateAmount(formData.esic_percent) : 0;

    const allowances = formData.allowances
      .filter((allowance) => allowance.include)
      .reduce((total, allowance) => total + calculateAmount(parseFloat(allowance.percent || 0)), 0);

    const deductions = formData.deductions
      .filter((deduction) => deduction.include)
      .reduce((total, deduction) => total + calculateAmount(parseFloat(deduction.percent || 0)), 0);

    const totalDeductions = deductions + pf + ptax + esic;

    return parseFloat(formData.basic_salary || 0) + hra + da + allowances + parseFloat(formData.bonus || 0) - totalDeductions;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const hra = formData.hra_include ? calculateAmount(formData.hra_percent) : 0;
    const da = formData.da_include ? calculateAmount(formData.da_percent) : 0;
    const pf = formData.pf_include ? calculateAmount(formData.pf_percent) : 0;
    const ptax = formData.ptax_include ? 200 : 0;
    const esic = formData.esic_include ? calculateAmount(formData.esic_percent) : 0;

    const allowances = formData.allowances
      .filter((allowance) => allowance.include)
      .reduce((total, allowance) => total + calculateAmount(parseFloat(allowance.percent || 0)), 0);

    const deductions = formData.deductions
      .filter((deduction) => deduction.include)
      .reduce((total, deduction) => total + calculateAmount(parseFloat(deduction.percent || 0)), 0);

    const totalDeductions = deductions + pf + ptax + esic;
    const net_pay = calculateNetPay();

    try {
      const res = await fetch('/api/hr/payroll/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empid,
          basic_salary: formData.basic_salary,
          hra,
          da,
          allowances,
          deductions: totalDeductions,
          pf,
          ptax,
          esic,
          bonus: formData.bonus,
          net_pay,
          month: formData.month,
          year: formData.year,
          allowance_details: formData.allowances.filter(a => a.include && a.name),
          deduction_details: formData.deductions.filter(d => d.include && d.name),
          hra_include: formData.hra_include,
          da_include: formData.da_include,
          pf_include: formData.pf_include,
          ptax_include: formData.ptax_include,
          esic_include: formData.esic_include
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setMessage('Payroll generated successfully!');
        setEmployeeData({ 
          empid: result.empid, 
          month: result.month, 
          year: result.year,
          payslipUrl: `/hr/payroll/payslip-preview/${empid}?month=${formData.month}&year=${formData.year}`
        });
      } else {
        const error = await res.json();
        setMessage('Error generating payroll: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error generating payroll');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
              <Calculator className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-gray-600 font-medium">Loading employee data...</p>
            <p className="text-gray-500 text-sm">Please wait while we fetch the details</p>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-gray-600 font-medium">Employee not found</p>
            <button 
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar />
      
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <button onClick={() => router.push('/hr/payroll/payroll-view')} className="hover:text-indigo-600 transition-colors">
              Payroll Management
            </button>
            <span>/</span>
            <button onClick={() => router.push('/hr/payroll/generate')} className="hover:text-indigo-600 transition-colors">
              Generate Payroll
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">{employee?.name || empid}</span>
          </nav>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Calculator className="w-6 h-6 text-indigo-600" />
                  Generate Payroll
                </h1>
                <p className="text-gray-600">Create salary slip for {employee?.name}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {/* Employee Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                Employee Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Employee ID</p>
                    <p className="font-medium text-gray-900">{employee.empid}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Full Name</p>
                    <p className="font-medium text-gray-900">{employee.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Email Address</p>
                    <p className="font-medium text-gray-900">{employee.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Contact Number</p>
                    <p className="font-medium text-gray-900">{employee.contact_no || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payroll Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  Payroll Period & Basic Salary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Salary Month <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="month"
                      value={formData.month}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select Month</option>
                      {['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'
                      ].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Salary Year <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Basic Salary (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">₹</span>
                      <input
                        type="number"
                        name="basic_salary"
                        value={formData.basic_salary}
                        onChange={handleChange}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter basic salary"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Allowances */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-green-600" />
                  Allowances
                </h3>
                
                {/* Fixed Allowances */}
                <div className="space-y-4 mb-6">
                  {['hra', 'da'].map((key) => (
                    <div key={key} className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <input
                        type="checkbox"
                        checked={formData[`${key}_include`]}
                        onChange={() => {
                          setFormData((prev) => ({
                            ...prev,
                            [`${key}_include`]: !prev[`${key}_include`],
                          }));
                        }}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <div className="flex-1 grid grid-cols-3 gap-4 items-center">
                        <div>
                          <p className="font-medium text-gray-900 uppercase">
                            {key === 'hra' ? 'House Rent Allowance (HRA)' : 'Dearness Allowance (DA)'}
                          </p>
                        </div>
                        <div>
                          <input
                            type="number"
                            name={`${key}_percent`}
                            value={formData[`${key}_percent`]}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Percentage"
                          />
                        </div>
                        <div>
                          <input
                            value={`₹ ${calculateAmount(formData[`${key}_percent`]).toFixed(2)}`}
                            readOnly
                            className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom Allowances */}
                <div className="space-y-4">
                  {formData.allowances.map((allowance, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <input
                        type="checkbox"
                        checked={allowance.include}
                        onChange={() => {
                          const updatedAllowances = [...formData.allowances];
                          updatedAllowances[index].include = !updatedAllowances[index].include;
                          setFormData({ ...formData, allowances: updatedAllowances });
                        }}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <div className="flex-1 grid grid-cols-3 gap-4 items-center">
                        <input
                          type="text"
                          name="name"
                          value={allowance.name}
                          onChange={(e) => handleAllowanceChange(index, e)}
                          placeholder="Allowance Name (e.g., Transport, Medical)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="number"
                          name="percent"
                          value={allowance.percent}
                          onChange={(e) => handleAllowanceChange(index, e)}
                          placeholder="Percentage"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          value={`₹ ${calculateAmount(parseFloat(allowance.percent || 0)).toFixed(2)}`}
                          readOnly
                          className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAllowance(index)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <button
                  type="button"
                  onClick={handleAddAllowance}
                  className="mt-4 flex items-center gap-2 px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Allowance
                </button>
              </div>

              {/* Deductions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Minus className="w-5 h-5 text-red-600" />
                  Deductions
                </h3>
                
                {/* Fixed Deductions */}
                <div className="space-y-4 mb-6">
                    {/* PF - Editable */}
                  <div className="flex items-center gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <input
                      type="checkbox"
                      checked={formData.pf_include}
                      onChange={() => {
                        setFormData((prev) => ({
                          ...prev,
                          pf_include: !prev.pf_include,
                        }));
                      }}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <div className="flex-1 grid grid-cols-3 gap-4 items-center">
                      <div>
                        <p className="font-medium text-gray-900">Provident Fund (PF)</p>
                      </div>
                      <div>
                        <input
                          type="number"
                          name="pf_percent"
                          value={formData.pf_percent}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="Percentage"
                        />
                      </div>
                      <div>
                        <input
                          value={`₹ ${calculateAmount(formData.pf_percent).toFixed(2)}`}
                          readOnly
                          className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* PTAX - Fixed */}
                  <div className="flex items-center gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <input
                      type="checkbox"
                      checked={formData.ptax_include}
                      onChange={() => {
                        setFormData((prev) => ({
                          ...prev,
                          ptax_include: !prev.ptax_include,
                        }));
                      }}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <div className="flex-1 grid grid-cols-3 gap-4 items-center">
                      <div>
                        <p className="font-medium text-gray-900">Professional Tax (PTAX)</p>
                        <p className="text-xs text-gray-500">Fixed Amount</p>
                      </div>
                      <div>
                        <input
                          type="text"
                          value="₹200"
                          readOnly
                          className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-medium"
                        />
                      </div>
                      <div>
                        <input
                          value={`₹ ${formData.ptax_include ? '200.00' : '0.00'}`}
                          readOnly
                          className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* ESIC - Fixed */}
                  <div className="flex items-center gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <input
                      type="checkbox"
                      checked={formData.esic_include}
                      onChange={() => {
                        setFormData((prev) => ({
                          ...prev,
                          esic_include: !prev.esic_include,
                        }));
                      }}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <div className="flex-1 grid grid-cols-3 gap-4 items-center">
                      <div>
                        <p className="font-medium text-gray-900">Employee State Insurance (ESIC)</p>
                        <p className="text-xs text-gray-500">Fixed Rate: 0.75%</p>
                      </div>
                      <div>
                        <input
                          type="text"
                          value="0.75%"
                          readOnly
                          className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-medium"
                        />
                      </div>
                      <div>
                        <input
                          value={`₹ ${calculateAmount(formData.esic_percent).toFixed(2)}`}
                          readOnly
                          className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custom Deductions */}
                <div className="space-y-4">
                  {formData.deductions.map((deduction, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <input
                        type="checkbox"
                        checked={deduction.include}
                        onChange={() => {
                          const updatedDeductions = [...formData.deductions];
                          updatedDeductions[index].include = !updatedDeductions[index].include;
                          setFormData({ ...formData, deductions: updatedDeductions });
                        }}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <div className="flex-1 grid grid-cols-3 gap-4 items-center">
                        <input
                          type="text"
                          name="name"
                          value={deduction.name}
                          onChange={(e) => handleDeductionChange(index, e)}
                          placeholder="Deduction Name (e.g., Loan, Advance)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="number"
                          name="percent"
                          value={deduction.percent}
                          onChange={(e) => handleDeductionChange(index, e)}
                          placeholder="Percentage"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          value={`₹ ${calculateAmount(parseFloat(deduction.percent || 0)).toFixed(2)}`}
                          readOnly
                          className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDeduction(index)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <button
                  type="button"
                  onClick={handleAddDeduction}
                  className="mt-4 flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Deduction
                </button>
              </div>

              {/* Bonus & Net Pay */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-indigo-600" />
                  Additional Benefits & Final Calculation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bonus Amount (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">₹</span>
                      <input
                        type="number"
                        name="bonus"
                        value={formData.bonus}
                        onChange={handleChange}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter bonus amount"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Net Salary (₹)
                    </label>
                    <div className="relative">
                      <Calculator className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={`₹ ${calculateNetPay().toFixed(2)}`}
                        readOnly
                        className="w-full pl-10 pr-3 py-2 bg-green-50 border border-green-300 rounded-lg text-green-800 font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Success Message and Actions */}
              {message && (
                <div className={`p-4 rounded-lg mb-6 ${
                  message.includes('successfully') 
                    ? 'bg-green-50 border border-green-200 text-green-800' 
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {message.includes('successfully') ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-medium">{message}</span>
                    </div>
                    {employeeData?.payslipUrl && (
                      <button
                        onClick={() => window.open(employeeData.payslipUrl, '_blank')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Payslip
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Generate Payroll
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}