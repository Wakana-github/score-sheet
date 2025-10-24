"use client";

import { useState } from "react";

export default function PrivacyAction() {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleExportData = async () => {
    setLoading("export");
    setMessage(null);

    try {
      const res = await fetch("/api/user/export-data", { method: "GET" });
      if (!res.ok) throw new Error("Failed to export data.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      // Create downloadable link
      const a = document.createElement("a");
      a.href = url;
      a.download = "your-data.json";
      document.body.appendChild(a);
      a.click();
      a.remove();

      setMessage("✅ Your data has been exported successfully.");
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to export data.");
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account and data?")) return;

    setLoading("delete");
    setMessage(null);

    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete data.");

      setMessage("✅ Your account and data have been deleted successfully.");
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to delete your account.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-4 border-t pt-4 space-y-3">
      <h3 className="text-lg font-semibold mb-2">Your Data Actions</h3>
      <button
        onClick={handleExportData}
        disabled={loading === "export"}
        className=" text-sm px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400"
      >
        {loading === "export" ? "Exporting..." : "Export My Data"}
      </button>
      <button
        onClick={handleDeleteAccount}
        disabled={loading === "delete"}
        className="text-sm px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 ml-3"
      >
        {loading === "delete" ? "Deleting..." : "Delete My Account"}
      </button>
      {message && <p className="mt-2 text-sm text-gray-700">{message}</p>}
    </div>
  );
}