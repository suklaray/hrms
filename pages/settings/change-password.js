export default function ChangePassword() {
  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Change Password</h2>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Current Password</label>
          <input type="password" className="w-full px-3 py-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium">New Password</label>
          <input type="password" className="w-full px-3 py-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium">Confirm New Password</label>
          <input type="password" className="w-full px-3 py-2 border rounded" />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Update Password
        </button>
      </form>
    </div>
  );
}
