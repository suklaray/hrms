import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import SideBar from "@/Components/SideBar";

export default function PayrollForm() {
  const router = useRouter();
  const { empid } = router.query;
  const [employee, setEmployee] = useState(null);
  const [formData, setFormData] = useState({
    basic_salary: '',
    hra_percent: 40,
    da_percent: 10,
    allowances: [{ name: '', percent: 20, include: true }],
    deductions: [{ name: '', percent: 5, include: true }],
    bonus: '', // Now HR can input the bonus
    month: '', // New field for month
    year: new Date().getFullYear(), // Auto-filled with current year
    hra_include: true,
    da_include: true,

    // New fixed deductions
    pf_percent: 10,
    ptax_percent: 10,
    esic_percent: 10,
    pf_include: true,
    ptax_include: true,
    esic_include: true,
  });

  useEffect(() => {
    if (!empid) return;
    fetch(`/api/hr/employees/${empid}`)
      .then((res) => res.json())
      .then((data) => setEmployee(data.employee))
      .catch((err) => console.error('Error fetching employee:', err));
  }, [empid]);

  const calculateAmount = (percent) => {
    return ((formData.basic_salary || 0) * percent) / 100;
  };
  
  const handleChange = (e) => {
    // Handle numeric inputs carefully: parse float else leave as text for select etc.
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Calculate fixed allowances/deductions only if included in calculations
    const hra = formData.hra_include ? calculateAmount(formData.hra_percent) : 0;
    const da = formData.da_include ? calculateAmount(formData.da_percent) : 0;

    const pf = formData.pf_include ? calculateAmount(formData.pf_percent) : 0;
    const ptax = formData.ptax_include ? calculateAmount(formData.ptax_percent) : 0;
    const esic = formData.esic_include ? calculateAmount(formData.esic_percent) : 0;

    const allowances = formData.allowances
      .filter((allowance) => allowance.include)
      .reduce((total, allowance) => total + calculateAmount(parseFloat(allowance.percent || 0)), 0);

    const deductions = formData.deductions
      .filter((deduction) => deduction.include)
      .reduce((total, deduction) => total + calculateAmount(parseFloat(deduction.percent || 0)), 0);

    const totalDeductions = deductions + pf + ptax + esic;

    const net_pay =
      parseFloat(formData.basic_salary || 0) +
      hra +
      da +
      allowances +
      parseFloat(formData.bonus || 0) -
      totalDeductions;

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
      }),
    });

    if (res.ok) {
      alert('Payroll generated!');
      router.push('/hr/payroll/payroll-view');
    } else {
      alert('Error generating payroll');
    }
  };

  if (!empid) return <div className="p-6">Waiting for employee ID...</div>;
  if (!employee) return <div className="p-6">Loading employee data...</div>;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <SideBar handleLogout={() => {}} />

      {/* Centered form content */}
      <div className="flex-1 flex justify-center items-center p-4">
        <div className="w-full max-w-4xl bg-white shadow-lg p-5 rounded-xl text-indigo-800">
          <h2 className="text-2xl font-bold mb-4 text-center">Generate Payroll Form</h2><br/>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input value={employee.empid} readOnly className="bg-gray-100 p-2 rounded text-center" />
              <input value={employee.name} readOnly className="bg-gray-100 p-2 rounded text-center" />
              <input value={employee.email} readOnly className="bg-gray-100 p-2 rounded text-center" />
              <input value={employee.contact_number} readOnly className="bg-gray-100 p-2 rounded text-center" />
            </div>
            <br></br> 
            {/* Month and Year */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-2">MONTH</div>
                <select
                  name="month"
                  value={formData.month}
                  onChange={handleChange}
                  className="w-full p-2 border rounded text-center mb-2"
                  required
                >
                  <option value="">Select Month</option>
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-2">YEAR</label>
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full p-2 border rounded text-center mb-2"
                />
              </div>
            </div>

            <div>
              <label className="block">BASIC SALARY (₹)</label>
              <input
                type="number"
                name="basic_salary"
                value={formData.basic_salary}
                onChange={handleChange}
                className="w-full p-2 border rounded text-center"
                required
              />
            </div>
            <label className="block">ALLOWANCE (%)</label><br/>

            {['hra', 'da'].map((key, index) => (
              <div key={index} className="flex items-center justify-between space-x-10 text-center">
                <div className="flex items-center space-x-6 p-1">
                  {/* Checkbox for HRA and DA */}
                  <input
                    type="checkbox"
                    checked={formData[`${key}_include`]}
                    onChange={() => {
                      setFormData((prev) => ({
                        ...prev,
                        [`${key}_include`]: !prev[`${key}_include`],
                      }));
                    }}
                    className="h-4 w-4 ml-9"
                  />
                  &emsp;

                  {/* HRA/DA Label */}
                  <div className="uppercase w-50 text-center">{key} (%)</div>

                  {/* HRA/DA Percentage Input */}
                  <input
                    type="number"
                    name={`${key}_percent`}
                    value={formData[`${key}_percent`]}
                    onChange={handleChange}
                    className="p-2 border rounded text-center ml-2"
                  />

                  {/* HRA/DA Amount Display */}
                  <input
                    value={calculateAmount(formData[`${key}_percent`]).toFixed(2)}
                    readOnly
                    className="p-2 bg-gray-100 rounded text-center"
                  />
                </div>
              </div>
            ))}

            {/* Allowances Section */}
            <div>
              {formData.allowances.map((allowance, index) => (
                <div key={index} className="flex items-center justify-between space-x-7 text-center">
                  <div className="flex items-center space-x-5 p-1">
                    <input
                      type="checkbox"
                      checked={allowance.include}
                      onChange={() => {
                        const updatedAllowances = [...formData.allowances];
                        updatedAllowances[index].include = !updatedAllowances[index].include;
                        setFormData({ ...formData, allowances: updatedAllowances });
                      }}
                      className="h-4 w-6 ml-9"
                    />&emsp;
                    <input
                      type="text"
                      name="name"
                      value={allowance.name}
                      onChange={(e) => handleAllowanceChange(index, e)}
                      placeholder="Allowance Name"
                      className="p-2 border rounded w-1/3 text-center uppercase"
                    />
                    <input
                      type="number"
                      name="percent"
                      value={allowance.percent}
                      onChange={(e) => handleAllowanceChange(index, e)}
                      placeholder="Percentage"
                      className="p-2 border rounded w-1/3 text-center"
                    />
                    <input
                      value={calculateAmount(parseFloat(allowance.percent || 0)).toFixed(2)}
                      readOnly
                      className="p-2 bg-gray-100 rounded w-1/3 text-center"
                    />
                    &emsp; &emsp;
                    <button
                      type="button"
                      onClick={() => handleRemoveAllowance(index)}
                      className="text-red-600 hover:text-red-800 text-center "
                    >
                      X 
                    </button>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={handleAddAllowance}
                className="mt-3 text-indigo-600 hover:text-indigo-800"
              >
                + Add Allowance
              </button>
            </div>

            {/* Deductions Section */}
            <div>
              <label className="block">DEDUCTION (%)</label><br/>

              {/* Fixed deductions: PF, PTAX, ESIC */}
              {['pf', 'ptax', 'esic'].map((key) => (
                <div key={key} className="flex items-center justify-between space-x-6 text-center p-1">
                  <input
                    type="checkbox"
                    checked={formData[`${key}_include`]}
                    onChange={() => {
                      setFormData((prev) => ({
                        ...prev,
                        [`${key}_include`]: !prev[`${key}_include`],
                      }));
                    }}
                    className="h-4 w-4 ml-9"
                  />
                  &emsp;
                  <div className="uppercase w-50 text-center">{key.toUpperCase()} (%)</div>

                  <input
                    type="number"
                    name={`${key}_percent`}
                    value={formData[`${key}_percent`]}
                    onChange={handleChange}
                    className="p-2 border rounded text-center ml-2 w-1/4"
                  />

                  <input
                    value={calculateAmount(formData[`${key}_percent`]).toFixed(2)}
                    readOnly
                    className="p-2 bg-gray-100 rounded text-center w-1/4"
                  />
                </div>
              ))}

              {/* User defined deductions */}
              {formData.deductions.map((deduction, index) => (
                <div key={index} className="flex items-center justify-between space-x-4 p-3">
                  <div className="flex items-center space-x-4 ">
                    &emsp;&emsp;
                    <input
                      type="checkbox"
                      checked={deduction.include}
                      onChange={() => {
                        const updatedDeductions = [...formData.deductions];
                        updatedDeductions[index].include = !updatedDeductions[index].include;
                        setFormData({ ...formData, deductions: updatedDeductions });
                      }}
                      className="h-4 w-4"
                    />&emsp;
                    <input
                      type="text"
                      name="name"
                      value={deduction.name}
                      onChange={(e) => handleDeductionChange(index, e)}
                      placeholder="Deduction Name"
                      className="p-2 border rounded w-1/3 text-center uppercase"
                    />
                    <input
                      type="number"
                      name="percent"
                      value={deduction.percent}
                      onChange={(e) => handleDeductionChange(index, e)}
                      placeholder="Percentage"
                      className="p-2 border rounded w-1/3 text-center"
                    />
                    <input
                      value={calculateAmount(parseFloat(deduction.percent || 0)).toFixed(2)}
                      readOnly
                      className="p-2 bg-gray-100 rounded w-1/3 text-center"
                    />
                    &emsp;&emsp;
                    <button
                      type="button"
                      onClick={() => handleRemoveDeduction(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddDeduction}
                className="mt-2 text-red-600 hover:text-red-800"
              >
                + Add Deduction
              </button>
            </div>

            

            {/* Bonus Section */}
            <div>
              <label className="block mb-2">BONUS (₹)</label>
              <input
                type="number"
                name="bonus"
                value={formData.bonus}
                onChange={handleChange}
                className="w-full p-2 border rounded text-center"
              />
            </div>

            {/* Net pay */}
            <div>
              <label className="block font-medium mb-2">NET PAY (₹)</label>
              <input
                type="number"
                value={
                  parseFloat(formData.basic_salary || 0) +
                  (formData.hra_include ? calculateAmount(formData.hra_percent) : 0) +
                  (formData.da_include ? calculateAmount(formData.da_percent) : 0) +
                  formData.allowances
                    .filter((a) => a.include)
                    .reduce((t, a) => t + calculateAmount(parseFloat(a.percent || 0)), 0) +
                  parseFloat(formData.bonus || 0) -
                  (
                    formData.deductions
                      .filter((d) => d.include)
                      .reduce((t, d) => t + calculateAmount(parseFloat(d.percent || 0)), 0) +
                    (formData.pf_include ? calculateAmount(formData.pf_percent) : 0) +
                    (formData.ptax_include ? calculateAmount(formData.ptax_percent) : 0) +
                    (formData.esic_include ? calculateAmount(formData.esic_percent) : 0)
                  )
                }
                readOnly
                className="w-full p-2 bg-gray-100 rounded text-center"
              />
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded mt-6 hover:bg-blue-700">
              Generate Payroll
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

