import { redirect } from "next/navigation";

export default function PayrollSetupPage() {
  redirect("/payroll/payroll-setup/payroll-get-configs");
}
