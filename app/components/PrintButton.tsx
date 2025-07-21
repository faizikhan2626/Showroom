"use client";

export default function PrintButton() {
  const handlePrint = () => {
    const printContent =
      document.getElementById("printable-content")?.innerHTML;
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = printContent || "";
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  return (
    <button
      onClick={handlePrint}
      className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded text-sm transition"
    >
      Print Details
    </button>
  );
}
