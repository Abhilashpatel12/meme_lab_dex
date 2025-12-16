'use client'
import { useState } from "react";
import { useCreateToken } from "../hooks/useCreateToken";
import { LabButton } from "../ui/LabButton"; 
import { LabInput } from "../ui/LabInput";   
import { useRouter } from "next/navigation"; 
import { toast } from "sonner"; 

export const LaunchForm = () => {
  const router = useRouter();
  const { createToken } = useCreateToken();
  
  // Form State
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLaunch = async () => {
    // 1. Validation
    if (!name || !symbol || !file) {
      toast.error("⚠️ MISSING DATA: Please fill in all fields.");
      return;
    }

    setIsLoading(true);

    try {
      // --- STEP 1: UPLOAD TO SERVER API (Arweave/Metaplex) ---
      toast.loading("Uploading to Arweave...", { id: "launch" });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);
      formData.append("symbol", symbol);
      formData.append("description", description);

      // Call our new secure API route
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${text}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Image upload failed");
      }

      const metadataUri = data.metadataUri;
      console.log("Arweave URI:", metadataUri);
      toast.success("Metadata Uploaded! Confirming Transaction...", { id: "launch" });

      // --- STEP 2: CREATE TOKEN ON SOLANA ---
      // Now we pass the real Arweave URI to your smart contract
      const mintAddress = await createToken(name, symbol, metadataUri);

      if (mintAddress) {
        toast.success("LAUNCH SUCCESSFUL! 🚀", { id: "launch" });
        router.push(`/token/${mintAddress}`);
      }
      
    } catch (error: any) {
      console.error("Launch aborted", error);
      toast.error("Launch Failed: " + error.message, { id: "launch" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10">
      {/* Card Container */}
      <div className="bg-lab-card border-2 border-lab-input rounded-2xl p-8 shadow-[0_0_50px_rgba(74,222,128,0.1)] relative overflow-hidden">
        
        {/* Decorative Top Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lab-green to-lab-purple" />

        <h2 className="text-3xl font-black text-white mb-2 text-center font-mono tracking-tighter">
          INITIATE <span className="text-lab-green">PROTOCOL</span>
        </h2>
        <p className="text-lab-muted text-center font-mono text-xs mb-8">
          // CAUTION: ASSETS LAUNCHED HERE ARE PERMANENT //
        </p>

        <div className="space-y-6">
          {/* Inputs */}
          <LabInput 
            label="Token Name" 
            placeholder="e.g. Radioactive Dog" 
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <LabInput 
            label="Ticker Symbol" 
            placeholder="e.g. RAD" 
            maxLength={10}
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          />

          <div className="flex flex-col gap-2">
            <label className="text-lab-green font-mono text-sm uppercase tracking-wider">
              Description
            </label>
            <textarea
              className="w-full bg-lab-dark border-2 border-lab-input rounded-lg p-3 text-white focus:border-lab-green focus:outline-none font-mono placeholder:text-lab-muted"
              rows={3}
              placeholder="Classified specimen details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Image Uploader */}
          <div className="flex flex-col gap-2">
            <label className="text-lab-green font-mono text-sm uppercase tracking-wider">
              Visual Data
            </label>
            <div className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer bg-lab-dark
              ${file ? 'border-lab-green bg-lab-green/10' : 'border-lab-input hover:border-lab-green'}
            `}>
              <input
                type="file"
                accept="image/*"
                className="hidden" 
                id="file-upload"
                onChange={(e) => e.target.files && setFile(e.target.files[0])}
              />
              <label htmlFor="file-upload" className="cursor-pointer block w-full h-full">
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-lab-green font-bold font-mono">
                    <span>✅ FILE LOADED:</span>
                    <span className="underline">{file.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                     <span className="text-4xl">📁</span>
                     <span className="text-lab-muted font-mono text-sm">
                       [ CLICK TO UPLOAD IMAGE ]
                     </span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Action Button */}
          <LabButton 
            onClick={handleLaunch} 
            isLoading={isLoading}
            className="w-full mt-4 text-lg"
          >
            {isLoading ? "UPLOADING & INITIALIZING..." : "LAUNCH TOKEN (0.02 SOL)"}
          </LabButton>
        </div>
      </div>
    </div>
  );
};