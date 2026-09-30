"use client";

import { useEffect, useMemo, useState } from "react";
import Head from "@/lib/compatHead";
import { useRouter } from "@/lib/compatRouter";
import { toast } from "react-toastify";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Layers,
  MoveDown,
  MoveUp,
  PenIcon,
  Plus,
  Save,
  Trash2,
  X,
  AlertTriangle,
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

export default function EditSalaryStructureClient({ uid }: { uid: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [masterComponents, setMasterComponents] = useState<MasterComponent[]>([]);
  const [assignedCount, setAssignedCount] = useState<number>(0);
  const [companyName, setCompanyName] = useState<string>("");

  // Form Fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [configuredComponents, setConfiguredComponents] = useState<StructureComponentEntry[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [modalComponentId, setModalComponentId] = useState("");
  const [modalCalcType, setModalCalcType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [modalValue, setModalValue] = useState("");
  const [modalBaseComponentId, setModalBaseComponentId] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [compRes, structureRes] = await Promise.all([
          fetch("/api/payroll/salary/components"),
          fetch(`/api/payroll/salary-structures/${uid}`),
        ]);

        if (compRes.ok) {
          const compData = await compRes.json();
          setMasterComponents(compData.salaryComponents || []);
        }

        if (structureRes.ok) {
          const sData = await structureRes.json();
          if (sData.success && sData.data) {
            const s = sData.data;
            setName(s.name || "");
            setCode(s.code || "");
            setDescription(s.description || "");
            setStatus(s.status || "ACTIVE");
            setAssignedCount(s.assignedEmployeesCount || 0);
            setCompanyName(s.company?.name || "");

            const initialComps: StructureComponentEntry[] = (s.components || []).map((c: any) => ({
              salary_component_id: c.salary_component_id,
              name: c.salaryComponent?.name || c.salary_component?.name || `Component #${c.salary_component_id}`,
              code: c.salaryComponent?.code || c.salary_component?.code || `C${c.salary_component_id}`,
              type: c.salaryComponent?.type || c.salary_component?.type || "EARNING",
              calculation_type: c.calculation_type,
              value: Number(c.value),
              base_component_id: c.base_component_id ? Number(c.base_component_id) : null,
              sequence: c.sequence || 0,
            }));
            setConfiguredComponents(initialComps);
          } else {
            toast.error(sData.message || "Failed to load salary structure.");
          }
        } else {
          toast.error("Salary structure not found.");
        }
      } catch (err: any) {
        console.error("Error loading structure:", err);
        toast.error(err?.message || "An unexpected network error occurred.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [uid]);

  const masterMap = useMemo(() => {
    const map = new Map<number, MasterComponent>();
    masterComponents.forEach((c) => map.set(c.id, c));
    return map;
  }, [masterComponents]);

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
    const compName = master?.name || `Component #${compId}`;
    const compCode = master?.code || `C${compId}`;
    const compType = master?.type || "EARNING";

    if (editingIndex === null) {
      const alreadyPresent = configuredComponents.some((c) => c.salary_component_id === compId);
      if (alreadyPresent) {
        toast.error(`"${compName}" is already included in this salary structure.`);
        return;
      }
    }

    const newEntry: StructureComponentEntry = {
      salary_component_id: compId,
      name: compName,
      code: compCode,
      type: compType,
      calculation_type: modalCalcType,
      value: val,
      base_component_id: modalCalcType === "PERCENTAGE" ? Number(modalBaseComponentId) : null,
      sequence:
        editingIndex !== null
          ? configuredComponents[editingIndex].sequence
          : configuredComponents.length + 1,
    };

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
    toast.success(editingIndex !== null ? `Updated "${compName}".` : `Added "${compName}".`);
  };

  // Remove component
  const handleRemoveComponent = (index: number) => {
    const itemToRemove = configuredComponents[index];
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
    const reindexed = updated.map((item, idx) => ({ ...item, sequence: idx + 1 }));
    setConfiguredComponents(reindexed);
    toast.info(`Removed component "${itemToRemove.name}".`);
  };

  // Move
  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= configuredComponents.length) return;

    const list = [...configuredComponents];
    const [moved] = list.splice(index, 1);
    list.splice(targetIdx, 0, moved);

    const reindexed = list.map((item, idx) => ({ ...item, sequence: idx + 1 }));
    setConfiguredComponents(reindexed);
  };

  // Live preview
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

  // Submit
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
      toast.error("Salary structure must contain at least one component.");
      return;
    }

    const payload = {
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
      const res = await fetch(`/api/payroll/salary-structures/${uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(result.message || "Salary structure updated successfully!");
        router.push("/payroll/payroll-setup/salary-structures");
      } else {
        toast.error(result.message || "Failed to update salary structure.");
      }
    } catch (err: any) {
      console.error("Error updating structure:", err);
      toast.error(err?.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/60 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Loading salary structure...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Edit Salary Structure | HRMS Payroll</title>
      </Head>

      <div className="min-h-screen bg-gray-50/60 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                    <PenIcon size={22} />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                      Edit Salary Structure
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      Modify rules, component sequences, and base calculation formulas for{" "}
                      <span className="font-semibold text-gray-800">{name}</span>.
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
                  <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Assigned notice banner */}
          {assignedCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs sm:text-sm text-amber-800">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Active Employee Assignments Notice</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  This structure is currently assigned to <b>{assignedCount} employee salary record(s)</b>.
                  Modifying this structure will update the reusable template definition for future assignments.
                  Historical employee salary versions remain strictly preserved in the database.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Structure Information */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Structure Information
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Company: <span className="font-semibold text-gray-800">{companyName}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Structure Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Structure Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-800 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

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

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Section 2: Components & Live Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                      Salary Components ({configuredComponents.length})
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
                    <tbody className="divide-y divide-gray-100">
                      {configuredComponents.map((item, idx) => {
                        const baseItem = item.base_component_id
                          ? configuredComponents.find(
                            (c) => c.salary_component_id === item.base_component_id
                          ) || masterMap.get(item.base_component_id)
                          : null;

                        return (
                          <tr key={item.salary_component_id} className="hover:bg-gray-50/50">
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

                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-gray-900">{item.name}</div>
                              <span className="text-[10px] font-mono text-gray-400">{item.code}</span>
                            </td>

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

                            <td className="py-2.5 px-3 font-medium text-gray-700">{item.calculation_type}</td>

                            <td className="py-2.5 px-3 font-mono font-semibold text-gray-900">
                              {item.calculation_type === "FIXED" ? (
                                `₹${Number(item.value).toLocaleString("en-IN")}`
                              ) : (
                                <span className="text-indigo-600 font-bold">{item.value}%</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              {item.calculation_type === "PERCENTAGE" ? (
                                <span className="text-indigo-600 font-medium">
                                  {baseItem?.name || `Base (#${item.base_component_id})`}
                                </span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(idx)}
                                  className="p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                                  title="Edit rule"
                                >
                                  <PenIcon size={13} />
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
                  </table>
                </div>
              </div>

              {/* Live Preview */}
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

                <div className="space-y-4">
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
                              {c.calculation_type === "FIXED" ? "Fixed" : `${c.value}% of ${c.baseComponentName || "Base"}`}
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
                <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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

            <div className="p-5 space-y-4 text-xs sm:text-sm">
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
                      setModalCalcType(master.calculation_type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED");
                    }
                  }}
                  disabled={editingIndex !== null}
                  className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                  required
                >
                  <option value="">-- Select Master Component --</option>
                  {masterComponents.map((c) => {
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

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Calculation Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={modalCalcType}
                  onChange={(e) => {
                    const ct = e.target.value as "FIXED" | "PERCENTAGE";
                    setModalCalcType(ct);
                    if (ct === "FIXED") setModalBaseComponentId("");
                  }}
                  className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="FIXED">FIXED (Direct Amount ₹)</option>
                  <option value="PERCENTAGE">PERCENTAGE (% of Base Component)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Value <span className="text-red-500">*</span>
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
                </div>
              )}
            </div>

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
