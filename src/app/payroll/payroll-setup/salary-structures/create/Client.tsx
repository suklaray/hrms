"use client";

import { useEffect, useMemo, useState } from "react";
import Head from "@/lib/compatHead";
import Pageheader from "@/Components/PageHeader";
import { useRouter } from "@/lib/compatRouter";
import { toast } from "react-toastify";
import Link from "next/link";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpRight,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  FileSpreadsheet,
  HelpCircle,
  Info,
  Layers,
  Percent,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Pencil,
} from "lucide-react";
import {
  calculateSalaryBreakdown,
  validateStructureComponents,
  type ComponentRuleInput,
} from "@/lib/salaryCalculation";

interface MasterComponent {
  id: number;
  uid: string;
  name: string;
  code: string;
  type: "EARNING" | "DEDUCTION";
  calculation_type: "FIXED" | "PERCENTAGE" | "FORMULA";
  taxable: boolean;
  statutory: boolean;
  active: boolean;
  company_id: string;
}

interface CompanyItem {
  id: number;
  uid: string;
  name: string;
}

interface StructureComponentEntry {
  salary_component_id: number;
  name: string;
  code: string;
  type: "EARNING" | "DEDUCTION";
  calculation_type: "FIXED" | "PERCENTAGE";
  value: number;
  base_component_id: number | null;
  sequence: number;
}

export default function CreateSalaryStructureClient({ user }: { user?: any } = {}) {
  const router = useRouter();

  // Master Data
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [masterComponents, setMasterComponents] = useState<MasterComponent[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [companyId, setCompanyId] = useState<string>("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  // Configured components inside this structure
  const [configuredComponents, setConfiguredComponents] = useState<StructureComponentEntry[]>([]);

  // Modal State for adding/editing a component
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Modal form fields
  const [modalComponentId, setModalComponentId] = useState<string>("");
  const [modalCalcType, setModalCalcType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [modalValue, setModalValue] = useState<string>("");
  const [modalBaseComponentId, setModalBaseComponentId] = useState<string>("");

  const [saving, setSaving] = useState(false);

  // Load companies and active salary components
  useEffect(() => {
    async function loadData() {
      try {
        const [compRes, compoRes] = await Promise.all([
          fetch("/api/company/companies"),
          fetch("/api/payroll/salary/components"),
        ]);

        if (compRes.ok) {
          const compData = await compRes.json();
          const list = compData.data || [];
          setCompanies(list);
          if (list.length > 0) {
            setCompanyId(list[0].uid);
          }
        }

        if (compoRes.ok) {
          const compoData = await compoRes.json();
          const list = compoData.salaryComponents || [];
          setMasterComponents(list.filter((c: MasterComponent) => c.active !== false));
        }
      } catch (err) {
        console.error("Error loading master data:", err);
        toast.error("Failed to load company or component master data.");
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  // Filter master components available for current selected company
  const availableMasterComponents = useMemo(() => {
    if (!companyId) return masterComponents;
    return masterComponents.filter((c) => c.company_id === companyId);
  }, [masterComponents, companyId]);

  // Master component lookup helper
  const masterMap = useMemo(() => {
    const map = new Map<number, MasterComponent>();
    masterComponents.forEach((c) => map.set(c.id, c));
    return map;
  }, [masterComponents]);

  // Auto-generate code from name if user hasn't manually customized code
  const handleNameChange = (val: string) => {
    setName(val);
    if (!code || code === generateCode(name)) {
      setCode(generateCode(val));
    }
  };

  const generateCode = (str: string) => {
    return str
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 16);
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingIndex(null);
    setModalComponentId("");
    setModalCalcType("FIXED");
    setModalValue("");
    setModalBaseComponentId("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (index: number) => {
    const item = configuredComponents[index];
    setEditingIndex(index);
    setModalComponentId(String(item.salary_component_id));
    setModalCalcType(item.calculation_type);
    setModalValue(String(item.value));
    setModalBaseComponentId(item.base_component_id ? String(item.base_component_id) : "");
    setIsModalOpen(true);
  };

  // Save Modal entry
  const handleSaveModalComponent = () => {
    const compId = Number(modalComponentId);
    if (!compId || isNaN(compId)) {
      toast.error("Please select a salary component.");
      return;
    }

    const val = Number(modalValue);
    if (isNaN(val) || val < 0) {
      toast.error("Please enter a valid non-negative number for value.");
      return;
    }

    if (modalCalcType === "PERCENTAGE") {
      if (!modalBaseComponentId) {
        toast.error("Percentage calculation requires a base component.");
        return;
      }
      const baseId = Number(modalBaseComponentId);
      if (baseId === compId) {
        toast.error("A component cannot reference itself as base component.");
        return;
      }
    }

    const master = masterMap.get(compId);
    if (!master) {
      toast.error("Selected component is invalid.");
      return;
    }

    // Check duplicate if adding
    if (editingIndex === null) {
      const alreadyPresent = configuredComponents.some((c) => c.salary_component_id === compId);
      if (alreadyPresent) {
        toast.error(`"${master.name}" is already included in this salary structure.`);
        return;
      }
    }

    const newEntry: StructureComponentEntry = {
      salary_component_id: compId,
      name: master.name,
      code: master.code,
      type: master.type,
      calculation_type: modalCalcType,
      value: val,
      base_component_id: modalCalcType === "PERCENTAGE" ? Number(modalBaseComponentId) : null,
      sequence:
        editingIndex !== null
          ? configuredComponents[editingIndex].sequence
          : configuredComponents.length + 1,
    };

    // Test for circular dependencies before committing
    const testList = [...configuredComponents];
    if (editingIndex !== null) {
      testList[editingIndex] = newEntry;
    } else {
      testList.push(newEntry);
    }

    const validation = validateStructureComponents(
      testList.map((t) => ({
        salary_component_id: t.salary_component_id,
        calculation_type: t.calculation_type,
        value: t.value,
        base_component_id: t.base_component_id,
      }))
    );

    if (!validation.valid) {
      toast.error(validation.error || "Circular dependency detected.");
      return;
    }

    setConfiguredComponents(testList);
    setIsModalOpen(false);
    toast.success(
      editingIndex !== null
        ? `Updated component "${master.name}".`
        : `Added component "${master.name}".`
    );
  };

  // Remove component
  const handleRemoveComponent = (index: number) => {
    const itemToRemove = configuredComponents[index];
    // Check if any other component depends on this one as a base
    const dependents = configuredComponents.filter(
      (c) => c.base_component_id === itemToRemove.salary_component_id
    );

    if (dependents.length > 0) {
      toast.error(
        `Cannot remove "${itemToRemove.name}" because ${dependents
          .map((d) => `"${d.name}"`)
          .join(", ")} depend on it as a base component.`
      );
      return;
    }

    const updated = configuredComponents.filter((_, i) => i !== index);
    // Re-index sequences
    const reindexed = updated.map((item, idx) => ({ ...item, sequence: idx + 1 }));
    setConfiguredComponents(reindexed);
    toast.info(`Removed component "${itemToRemove.name}".`);
  };

  // Move Up / Down
  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= configuredComponents.length) return;

    const list = [...configuredComponents];
    const [moved] = list.splice(index, 1);
    list.splice(targetIdx, 0, moved);

    const reindexed = list.map((item, idx) => ({ ...item, sequence: idx + 1 }));
    setConfiguredComponents(reindexed);
  };

  // Live preview calculation (Section 21)
  const breakdown = useMemo(() => {
    if (configuredComponents.length === 0) {
      return { components: [], totalEarnings: 0, totalDeductions: 0, netSalary: 0 };
    }

    const rules: ComponentRuleInput[] = configuredComponents.map((c) => ({
      salary_component_id: c.salary_component_id,
      calculation_type: c.calculation_type,
      value: c.value,
      base_component_id: c.base_component_id,
      sequence: c.sequence,
      name: c.name,
      code: c.code,
      type: c.type,
    }));

    return calculateSalaryBreakdown(rules);
  }, [configuredComponents]);

  // Submit Salary Structure
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Structure Name is required.");
      return;
    }
    if (!code.trim()) {
      toast.error("Structure Code is required.");
      return;
    }
    if (configuredComponents.length === 0) {
      toast.error("Please add at least one salary component to the structure.");
      return;
    }

    // Backend payload matching Section 12 specification
    const payload = {
      company_id: companyId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || null,
      status,
      components: configuredComponents.map((c, idx) => ({
        salary_component_id: c.salary_component_id,
        calculation_type: c.calculation_type,
        value: c.value,
        base_component_id: c.base_component_id || null,
        sequence: c.sequence || idx + 1,
      })),
    };

    setSaving(true);
    try {
      const res = await fetch("/api/payroll/salary-structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(result.message || "Salary structure created successfully!");
        router.push("/payroll/payroll-setup/salary-structures");
      } else {
        toast.error(result.message || "Failed to create salary structure.");
      }
    } catch (err: any) {
      console.error("Error creating salary structure:", err);
      toast.error(err?.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create Salary Structure | HRMS Payroll</title>
      </Head>

      <div className="min-h-screen bg-gray-50/60 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                    <Plus size={22} />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                      Create Salary Structure
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      Define a reusable salary template with earning rules, deductions, and percentage calculation sequences.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Link
                  href="/payroll/payroll-setup/salary-structures"
                  className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs sm:text-sm font-medium rounded-lg shadow-xs transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-all shadow-indigo-200 disabled:opacity-50"
                >
                  <Save size={16} />
                  <span>{saving ? "Saving..." : "Save Salary Structure"}</span>
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Salary Structure Information */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    1. Salary Structure Information
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Basic identification and status of the reusable template.
                  </p>
                </div>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                  Step 1 of 2
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Company */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Company <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  >
                    {companies.map((c) => (
                      <option key={c.uid} value={c.uid}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Structure Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Structure Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Developer Salary"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Structure Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DEV-SAL"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-800 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Standard salary structure for Software Development and Engineering teams."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Section 2: Salary Components & Live Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Components List & Builder (2 Cols) */}
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                      2. Salary Components
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Configure earnings, deductions, calculation types (Fixed / Percentage), and base references.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openAddModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Component</span>
                  </button>
                </div>

                {/* Components Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        <th className="py-2.5 px-3 text-center">Order</th>
                        <th className="py-2.5 px-3">Component</th>
                        <th className="py-2.5 px-3 text-center">Type</th>
                        <th className="py-2.5 px-3">Calculation</th>
                        <th className="py-2.5 px-3">Value</th>
                        <th className="py-2.5 px-3">Based On</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>

                    {configuredComponents.length === 0 ? (
                      <tbody>
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-gray-400">
                            <div className="max-w-xs mx-auto flex flex-col items-center">
                              <Layers size={24} className="text-gray-300 mb-2" />
                              <p className="font-semibold text-gray-700">No components added yet</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                Click &quot;Add Component&quot; to attach Basic Salary, HRA, Allowances, or Deductions.
                              </p>
                              <button
                                type="button"
                                onClick={openAddModal}
                                className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-md text-[11px] font-semibold"
                              >
                                <Plus size={12} /> Add First Component
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    ) : (
                      <tbody className="divide-y divide-gray-100">
                        {configuredComponents.map((item, idx) => {
                          const baseItem = item.base_component_id
                            ? configuredComponents.find(
                              (c) => c.salary_component_id === item.base_component_id
                            ) || masterMap.get(item.base_component_id)
                            : null;

                          return (
                            <tr key={item.salary_component_id} className="hover:bg-gray-50/50">
                              {/* Order & Sequence controls */}
                              <td className="py-2.5 px-3 text-center">
                                <div className="inline-flex items-center gap-1">
                                  <span className="font-mono text-gray-600 font-semibold text-xs">
                                    {item.sequence || idx + 1}
                                  </span>
                                  <div className="flex flex-col">
                                    <button
                                      type="button"
                                      onClick={() => handleMove(idx, "up")}
                                      disabled={idx === 0}
                                      className="text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer"
                                    >
                                      <MoveUp size={10} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMove(idx, "down")}
                                      disabled={idx === configuredComponents.length - 1}
                                      className="text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer"
                                    >
                                      <MoveDown size={10} />
                                    </button>
                                  </div>
                                </div>
                              </td>

                              {/* Component */}
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-gray-900">{item.name}</div>
                                <span className="text-[10px] font-mono text-gray-400">{item.code}</span>
                              </td>

                              {/* Type */}
                              <td className="py-2.5 px-3 text-center">
                                {item.type === "EARNING" ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    EARNING
                                  </span>
                                ) : (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    DEDUCTION
                                  </span>
                                )}
                              </td>

                              {/* Calculation */}
                              <td className="py-2.5 px-3">
                                <span className="font-medium text-gray-700">
                                  {item.calculation_type}
                                </span>
                              </td>

                              {/* Value */}
                              <td className="py-2.5 px-3 font-mono font-semibold text-gray-900">
                                {item.calculation_type === "FIXED" ? (
                                  `₹${Number(item.value).toLocaleString("en-IN")}`
                                ) : (
                                  <span className="text-indigo-600 font-bold">{item.value}%</span>
                                )}
                              </td>

                              {/* Based On */}
                              <td className="py-2.5 px-3">
                                {item.calculation_type === "PERCENTAGE" ? (
                                  <span className="text-indigo-600 font-medium">
                                    {baseItem?.name || `Base (#${item.base_component_id})`}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-2.5 px-3 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(idx)}
                                    className="p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                                    title="Edit rule"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveComponent(idx)}
                                    className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                    title="Remove component"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    )}
                  </table>
                </div>

                <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                  <Info size={13} />
                  <span>
                    Fixed values are taken directly. Percentage values are computed against their base component in evaluation order.
                  </span>
                </div>
              </div>

              {/* Section 21: Live Structure Preview (1 Col) */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Banknote size={16} className="text-indigo-600" />
                      <span>Live Salary Preview</span>
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Instant evaluation of configured structure rules.
                    </p>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                    Live
                  </span>
                </div>

                {configuredComponents.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 text-xs">
                    Add components to see live salary calculations and earnings/deductions breakdown.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Component-by-component breakdown */}
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {breakdown.components.map((c) => {
                        const isEarning = c.type === "EARNING";
                        return (
                          <div
                            key={c.salary_component_id}
                            className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-gray-800">{c.name}</div>
                              <div className="text-[10px] text-gray-400">
                                {c.calculation_type === "FIXED" ? (
                                  "Fixed"
                                ) : (
                                  `${c.value}% of ${c.baseComponentName || "Base"}`
                                )}
                              </div>
                            </div>
                            <span
                              className={`font-mono font-bold ${isEarning ? "text-emerald-700" : "text-amber-700"
                                }`}
                            >
                              {isEarning ? "+" : "-"}₹{c.amount.toLocaleString("en-IN")}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary Cards */}
                    <div className="space-y-2.5 pt-3 border-t border-gray-100 text-xs">
                      <div className="flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-1">
                          <ArrowUpRight size={13} className="text-emerald-600" />
                          <span>Total Earnings:</span>
                        </span>
                        <span className="font-mono font-bold text-gray-900 text-sm">
                          ₹{breakdown.totalEarnings.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-1">
                          <ArrowDownRight size={13} className="text-amber-600" />
                          <span>Total Deductions:</span>
                        </span>
                        <span className="font-mono font-bold text-amber-700 text-sm">
                          -₹{breakdown.totalDeductions.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider block">
                            Net Take-Home
                          </span>
                          <span className="text-[10px] text-indigo-600">Before employee-level adjustments</span>
                        </div>
                        <span className="font-mono font-bold text-indigo-700 text-lg">
                          ₹{breakdown.netSalary.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
              <Link
                href="/payroll/payroll-setup/salary-structures"
                className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Back to Structures List
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-all shadow-indigo-200 disabled:opacity-50"
              >
                <Save size={16} />
                <span>{saving ? "Saving Salary Structure..." : "Save Salary Structure"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SECTION 20: ADD / EDIT SALARY COMPONENT MODAL */}
      {/* =================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">
                {editingIndex !== null ? "Edit Salary Component Rule" : "Add Salary Component to Structure"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs sm:text-sm">
              {/* Component Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Salary Component <span className="text-red-500">*</span>
                </label>
                <select
                  value={modalComponentId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setModalComponentId(id);
                    const master = masterMap.get(Number(id));
                    if (master) {
                      if (master.calculation_type === "PERCENTAGE") {
                        setModalCalcType("PERCENTAGE");
                      } else {
                        setModalCalcType("FIXED");
                      }
                    }
                  }}
                  disabled={editingIndex !== null}
                  className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                  required
                >
                  <option value="">-- Select Master Component --</option>
                  {availableMasterComponents.map((c) => {
                    // Disable components already added to the structure (unless editing this row)
                    const isAlreadyAdded =
                      editingIndex === null &&
                      configuredComponents.some((cc) => cc.salary_component_id === c.id);

                    return (
                      <option key={c.id} value={c.id} disabled={isAlreadyAdded}>
                        {c.name} ({c.code}) - [{c.type}] {isAlreadyAdded ? "(Already Added)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Calculation Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Calculation Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={modalCalcType}
                  onChange={(e) => {
                    const ct = e.target.value as "FIXED" | "PERCENTAGE";
                    setModalCalcType(ct);
                    if (ct === "FIXED") {
                      setModalBaseComponentId("");
                    }
                  }}
                  className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="FIXED">FIXED (Direct Amount ₹)</option>
                  <option value="PERCENTAGE">PERCENTAGE (% of Base Component)</option>
                </select>
              </div>

              {/* Value Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Value <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">
                    {modalCalcType === "FIXED" ? "(Amount in ₹)" : "(Percentage %)"}
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={modalCalcType === "FIXED" ? "e.g. 25000" : "e.g. 40"}
                  value={modalValue}
                  onChange={(e) => setModalValue(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  required
                />
              </div>

              {/* Based On (Base Component Selector) - Section 20 requirement */}
              {modalCalcType === "PERCENTAGE" && (
                <div className="animate-in fade-in duration-150">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Based On (Base Component) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={modalBaseComponentId}
                    onChange={(e) => setModalBaseComponentId(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  >
                    <option value="">-- Select Base Component --</option>
                    {configuredComponents
                      .filter((c) => c.salary_component_id !== Number(modalComponentId))
                      .map((c) => (
                        <option key={c.salary_component_id} value={c.salary_component_id}>
                          {c.name} ({c.code}) - {c.calculation_type === "FIXED" ? `₹${c.value}` : `${c.value}%`}
                        </option>
                      ))}
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Select which existing component this percentage will calculate against (e.g. Basic Salary).
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModalComponent}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                {editingIndex !== null ? "Update Component" : "Add Component"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
