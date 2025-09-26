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
    allowances: [],
    deductions: [],
    bonus: '',
    month: '',
    year: new Date().getFullYear(),
    hra_include: true,
    da_include: true,
    pf_percent: 10,
    ptax_percent: 10,
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
          
          // Parse allowance and deduction details
          const allowanceDetails = lastPayroll.allowance_details ? JSON.parse(lastPayroll.allowance_details) : [];
          const deductionDetails = lastPayroll.deduction_details ? JSON.parse(lastPayroll.deduction_details) : [];
          
          // Filter out fixed allowances and deductions to get custom ones
          const customAllowances = allowanceDetails.filter(item => 
            !['House Rent Allowance (HRA)', 'Dearness Allowance (DA)'].includes(item.name)
          ).map(item => ({ name: item.name, percent: item.percent || 0, include: true }));
          
          const customDeductions = deductionDetails.filter(item => 
            !['Provident Fund (PF)', 'Professional Tax (PTAX)', 'Employee State Insurance (ESIC)'].includes(item.name)
          ).map(item => ({ name: item.name, percent: item.percent || 0, include: true }));
          
          // Calculate percentages from amounts
          const basicSalary = Number(lastPayroll.basic_salary) || 0;
          const hraPercent = basicSalary > 0 ? ((Number(lastPayroll.hra) || 0) / basicSalary * 100) : 40;
          const daPercent = basicSalary > 0 ? ((Number(lastPayroll.da) || 0) / basicSalary * 100) : 10;
          const pfPercent = basicSalary > 0 ? ((Number(lastPayroll.pf) || 0) / basicSalary * 100) : 10;
          const ptaxPercent = basicSalary > 0 ? ((Number(lastPayroll.ptax) || 0) / basicSalary * 100) : 10;
          const esicPercent = basicSalary > 0 ? ((Number(lastPayroll.esic) || 0) / basicSalary * 100) : 0.75;
          
          // Pre-fill form with previous data
          setFormData(prev => ({
            ...prev,
            basic_salary: lastPayroll.basic_salary || '',
            bonus: lastPayroll.bonus || '',
            hra_percent: Math.round(hraPercent * 100) / 100,
            da_percent: Math.round(daPercent * 100) / 100,
            pf_percent: Math.round(pfPercent * 100) / 100,
            ptax_percent: Math.round(ptaxPercent * 100) / 100,
            esic_percent: Math.round(esicPercent * 100) / 100,
            allowances: customAllowances,
            deductions: customDeductions,
            hra_include: Number(lastPayroll.hra) > 0,
            da_include: Number(lastPayroll.da) > 0,
            pf_include: Number(lastPayroll.pf) > 0,
            ptax_include: Number(lastPayroll.ptax) > 0,
            esic_include: Number(lastPayroll.esic) > 0
          }));
          
          setMessage(`Last payroll generated on: ${new Date(lastPayroll.generated_on).toLocaleString()}`);
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
    const { name, value, type } = e.target;
    let newValue = value;
    if (type === 'number') {
      if (value === '') {
        newValue = '';
      } else {
        const numValue = parseFloat(value);
        newValue = numValue < 0 ? 0 : value;
      }
    }
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleAllowanceChange = (index, e) => {
    const updatedAllowances = [...formData.allowances];
    if(e.target.name === 'percent'){
      if (e.target.value === '') {
        updatedAllowances[index][e.target.name] = '';
      } else {
        const numValue = parseFloat(e.target.value);
        updatedAllowances[index][e.target.name] = numValue < 0 ? 0 : e.target.value;
      }
    } else {
      updatedAllowances[index][e.target.name] = e.target.value;
    }
    setFormData(prev => ({ ...prev, allowances: updatedAllowances }));
  };

  const handleDeductionChange = (index, e) => {
    const updatedDeductions = [...formData.deductions];
    if(e.target.name === 'percent'){
      if (e.target.value === '') {
        updatedDeductions[index][e.target.name] = '';
      } else {
        const numValue = parseFloat(e.target.value);
        updatedDeductions[index][e.target.name] = numValue < 0 ? 0 : e.target.value;
      }
    } else {
      updatedDeductions[index][e.target.name] = e.target.value;
    }
    setFormData(prev => ({ ...prev, deductions: updatedDeductions }));
  };

  const handleAddAllowance = () => {
    setFormData(prev => ({
      ...prev,
      allowances: [...prev.allowances, { name: '', percent: 0, include: true }],
    }));
  };

  const handleAddDeduction = () => {
    setFormData(prev => ({
      ...prev,
      deductions: [...prev.deductions, { name: '', percent: 0, include: true }],
    }));
  };

  const handleRemoveAllowance = (index) => {
    setFormData(prev => {
      const updatedAllowances = [...prev.allowances];
      updatedAllowances.splice(index, 1);
      return { ...prev, allowances: updatedAllowances };
    });
  };

  const handleRemoveDeduction = (index) => {
    setFormData(prev => {
      const updatedDeductions = [...prev.deductions];
      updatedDeductions.splice(index, 1);
      return { ...prev, deductions: updatedDeductions };
    });
  };

  const calculateNetPay = () => {
    const hra = formData.hra_include ? calculateAmount(formData.hra_percent) : 0;
    const da = formData.da_include ? calculateAmount(formData.da_percent) : 0;
    const pf = formData.pf_include ? calculateAmount(formData.pf_percent) : 0;
    const ptax = formData.ptax_include ? calculateAmount(formData.ptax_percent) : 0;
    const esic = formData.esic_include ? calculateAmount(formData.esic_percent) : 0;

    const customAllowances = formData.allowances
      .filter((allowance) => allowance.include)
      .reduce((total, allowance) => total + calculateAmount(parseFloat(allowance.percent || 0)), 0);

    const customDeductions = formData.deductions
      .filter((deduction) => deduction.include)
      .reduce((total, deduction) => total + calculateAmount(parseFloat(deduction.percent || 0)), 0);

    const totalAllowances = hra + da + customAllowances;
    const totalDeductions = customDeductions + pf + ptax + esic;

    return parseFloat(formData.basic_salary || 0) + totalAllowances + parseFloat(formData.bonus || 0) - totalDeductions;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const hra = formData.hra_include ? calculateAmount(formData.hra_percent) : 0;
    const da = formData.da_include ? calculateAmount(formData.da_percent) : 0;
    const pf = formData.pf_include ? calculateAmount(formData.pf_percent) : 0;
    const ptax = formData.ptax_include ? calculateAmount(formData.ptax_percent) : 0;
    const esic = formData.esic_include ? calculateAmount(formData.esic_percent) : 0;

    const customAllowances = formData.allowances
      .filter((allowance) => allowance.include)
      .reduce((total, allowance) => total + calculateAmount(parseFloat(allowance.percent || 0)), 0);

    const totalAllowances = hra + da + customAllowances;

    const customDeductions = formData.deductions
      .filter((deduction) => deduction.include)
      .reduce((total, deduction) => total + calculateAmount(parseFloat(deduction.percent || 0)), 0);

    const totalDeductions = customDeductions + pf + ptax + esic;
    const net_pay = calculateNetPay();

    // Generate payslip PDF path
    const payslipPath = `/payslips/${empid}_${formData.month}_${formData.year}.pdf`;

    try {
      const res = await fetch('/api/hr/payroll/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empid,
          basic_salary: formData.basic_salary,
          hra,
          da,
          allowances: totalAllowances,
          deductions: totalDeductions,
          pf,
          ptax,
          esic,
          bonus: formData.bonus,
          net_pay,
          month: formData.month,
          year: formData.year,
          payslip_pdf: payslipPath,
          allowance_details: [
            ...(formData.hra_include ? [{ name: 'House Rent Allowance (HRA)', percent: formData.hra_percent, amount: calculateAmount(formData.hra_percent) }] : []),
            ...(formData.da_include ? [{ name: 'Dearness Allowance (DA)', percent: formData.da_percent, amount: calculateAmount(formData.da_percent) }] : []),
            ...formData.allowances.filter(a => a.include && a.name).map(a => ({ ...a, amount: calculateAmount(parseFloat(a.percent || 0)) }))
          ],
          deduction_details: [
            ...(formData.pf_include ? [{ name: 'Provident Fund (PF)', percent: formData.pf_percent, amount: calculateAmount(formData.pf_percent) }] : []),
            ...(formData.ptax_include ? [{ name: 'Professional Tax (PTAX)', percent: formData.ptax_percent, amount: calculateAmount(formData.ptax_percent) }] : []),
            ...(formData.esic_include ? [{ name: 'Employee State Insurance (ESIC)', percent: formData.esic_percent, amount: calculateAmount(formData.esic_percent) }] : []),
            ...formData.deductions.filter(d => d.include && d.name).map(d => ({ ...d, amount: calculateAmount(parseFloat(d.percent || 0)) }))
          ],
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
        // Reset form after successful submission
        setFormData(prev => ({ ...prev, month: '', year: new Date().getFullYear() }));
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
              
              {/* Last Generated Message */}
              {message && message.includes('Last payroll generated') && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">{message}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                    <p className="font-medium text-gray-900">{employee.contact_number || 'Not provided'}</p>
                  </div>
                </div>
              </div>
              
              {/* Bank Details */}
              {employee.bankDetails && (
                <div>
                  <h3 className="text-md font-semibold text-gray-900 mb-3">Bank Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Account Holder</p>
                        <p className="font-medium text-gray-900">{employee.bankDetails.account_holder_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Bank Name</p>
                        <p className="font-medium text-gray-900">{employee.bankDetails.bank_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Account Number</p>
                        <p className="font-medium text-gray-900">{employee.bankDetails.account_number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">IFSC Code</p>
                        <p className="font-medium text-gray-900">{employee.bankDetails.ifsc_code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Branch</p>
                        <p className="font-medium text-gray-900">{employee.bankDetails.branch_name || 'Not provided'}</p>
                      </div>
                    </div>
                    {employee.bankDetails.checkbook_document && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Bank Document</p>
                          <a href={employee.bankDetails.checkbook_document} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer">View Document</a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                        step="0.01"
                        min="0"
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
                  <div className="hidden md:grid grid-cols-4 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wide px-4">
                    <div></div>
                    <div className="text-center">Name</div>
                    <div className="text-center">Percentage</div>
                    <div className="text-center">Amount</div>
                  </div>
                  {['hra', 'da'].map((key) => (
                    <div key={key} className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <input
                        type="checkbox"
                        checked={formData[`${key}_include`]}
                        onChange={() => {
                          setFormData((prev) => ({
                            ...prev,
                            [`${key}_include`]: !prev[`${key}_include`],
                          }));
                        }}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500 mt-1 md:mt-0"
                      />
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                        <div className="md:hidden">
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Name</label>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm md:text-base">
                            {key === 'hra' ? 'House Rent Allowance (HRA)' : 'Dearness Allowance (DA)'}
                          </p>
                        </div>
                        <div>
                          <label className="block md:hidden text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Percentage</label>
                          <div className="relative">
                            <input
                              type="number"
                              name={`${key}_percent`}
                              value={formData[`${key}_percent`]}
                              onChange={handleChange}
                              className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                              placeholder="0"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
                          </div>
                        </div>
                        <div>
                          <label className="block md:hidden text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Amount</label>
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
                {formData.allowances.length > 0 && (
                  <div className="space-y-4">
                    <div className="hidden md:grid grid-cols-5 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wide px-4">
                      <div></div>
                      <div className="text-center">Name</div>
                      <div className="text-center">Percentage</div>
                      <div className="text-center">Amount</div>
                      <div></div>
                    </div>
                    {formData.allowances.map((allowance, index) => (
                      <div key={index} className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <input
                          type="checkbox"
                          checked={allowance.include}
                          onChange={() => {
                            setFormData(prev => {
                              const updatedAllowances = [...prev.allowances];
                              updatedAllowances[index].include = !updatedAllowances[index].include;
                              return { ...prev, allowances: updatedAllowances };
                            });
                          }}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 mt-1 md:mt-0"
                        />
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                          <div>
                            <label className="block md:hidden text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Name</label>
                            <input
                              type="text"
                              name="name"
                              value={allowance.name}
                              onChange={(e) => handleAllowanceChange(index, e)}
                              placeholder="Allowance Name (e.g., Transport, Medical)"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block md:hidden text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Percentage</label>
                            <div className="relative">
                              <input
                                type="number"
                                name="percent"
                                value={allowance.percent}
                                onChange={(e) => handleAllowanceChange(index, e)}
                                placeholder="0"
                                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="block md:hidden text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Amount</label>
                            <input
                              value={`₹ ${calculateAmount(parseFloat(allowance.percent || 0)).toFixed(2)}`}
                              readOnly
                              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAllowance(index)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors self-start md:self-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
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
                  <div className="hidden md:grid grid-cols-4 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wide px-4">
                    <div></div>
                    <div className="text-center">Name</div>
                    <div className="text-center">Percentage</div>
                    <div className="text-center">Amount</div>
                  </div>
                  
                  {/* PF - Editable */}
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <input
                      type="checkbox"
                      checked={formData.pf_include}
                      onChange={() => {
                        setFormData((prev) => ({
                          ...prev,
                          pf_include: !prev.pf_include,
                        }));
                      }}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500 mt-1 md:mt-0"
                    />
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                      <div>
                        <label className="block md:hidden text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Name</label>
                        <p className="font-medium text-gray-900 text-sm md:text-base">Provident Fund (PF)</p>
                      </div>
                      <div>
                        <label className="block md:hidden text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Percentage</label>
                        <div className="relative">
                          <input
                            type="number"
                            name="pf_percent"
                            value={formData.pf_percent}
                            onChange={handleChange}
                            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="block md:hidden text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Amount</label>
                        <input
                          value={`₹ ${calculateAmount(formData.pf_percent).toFixed(2)}`}
                          readOnly
                          className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* PTAX - Editable */}
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <input
                      type="checkbox"
                      checked={formData.ptax_include}
                      onChange={() => {
                        setFormData((prev) => ({
                          ...prev,
                          ptax_include: !prev.ptax_include,
                        }));
                      }}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500 mt-1 md:mt-0"
                    />
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                      <div>
                        <label className="block md:hidden text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Name</label>
                        <p className="font-medium text-gray-900 text-sm md:text-base">Professional Tax (PTAX)</p>
                      </div>
                      <div>
                        <label className="block md:hidden text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Percentage</label>
                        <div className="relative">
                          <input
                            type="number"
                            name="ptax_percent"
                            value={formData.ptax_percent}
                            onChange={handleChange}
                            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="block md:hidden text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Amount</label>
                        <input
                          value={`₹ ${calculateAmount(formData.ptax_percent).toFixed(2)}`}
                          readOnly
                          className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* ESIC - Editable */}
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <input
                      type="checkbox"
                      checked={formData.esic_include}
                      onChange={() => {
                        setFormData((prev) => ({
                          ...prev,
                          esic_include: !prev.esic_include,
                        }));
                      }}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500 mt-1 md:mt-0"
                    />
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                      <div>
                        <label className="block md:hidden text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Name</label>
                        <p className="font-medium text-gray-900 text-sm md:text-base">Employee State Insurance (ESIC)</p>
                      </div>
                      <div>
                        <label className="block md:hidden text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Percentage</label>
                        <div className="relative">
                          <input
                            type="number"
                            name="esic_percent"
                            value={formData.esic_percent}
                            onChange={handleChange}
                            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="block md:hidden text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Amount</label>
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
                {formData.deductions.length > 0 && (
                  <div className="space-y-4">
                    <div className="hidden md:grid grid-cols-5 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wide px-4">
                      <div></div>
                      <div className="text-center">Name</div>
                      <div className="text-center">Percentage</div>
                      <div className="text-center">Amount</div>
                      <div></div>
                    </div>
                    {formData.deductions.map((deduction, index) => (
                      <div key={index} className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <input
                          type="checkbox"
                          checked={deduction.include}
                          onChange={() => {
                            setFormData(prev => {
                              const updatedDeductions = [...prev.deductions];
                              updatedDeductions[index].include = !updatedDeductions[index].include;
                              return { ...prev, deductions: updatedDeductions };
                            });
                          }}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 mt-1 md:mt-0"
                        />
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                          <div>
                            <label className="block md:hidden text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Name</label>
                            <input
                              type="text"
                              name="name"
                              value={deduction.name}
                              onChange={(e) => handleDeductionChange(index, e)}
                              placeholder="Deduction Name (e.g., Loan, Advance)"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block md:hidden text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Percentage</label>
                            <div className="relative">
                              <input
                                type="number"
                                name="percent"
                                value={deduction.percent}
                                onChange={(e) => handleDeductionChange(index, e)}
                                placeholder="0"
                                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="block md:hidden text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Amount</label>
                            <input
                              value={`₹ ${calculateAmount(parseFloat(deduction.percent || 0)).toFixed(2)}`}
                              readOnly
                              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDeduction(index)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors self-start md:self-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
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
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
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
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
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