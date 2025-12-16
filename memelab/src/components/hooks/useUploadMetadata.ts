'use client'

import { toast } from "sonner";


export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
}

export const useUploadMetadata = () => {
  /**
   * @param metadata
   */
  const upload = async (metadata: TokenMetadata): Promise<string | null> => {
    const uploadUrl = process.env.NEXT_PUBLIC_METADATA_UPLOAD_URL;

    try {
      toast.loading("Uploading metadata...", { id: "upload" });

      let uri: string;

      if (uploadUrl) {
        // POST to your backend / serverless function that handles Arweave/Irys upload
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metadata),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Upload endpoint error: ${res.status} - ${text}`);
        }

        const data = await res.json();
        uri = data.uri;

        if (!uri || typeof uri !== "string") {
          throw new Error("Upload endpoint did not return a valid uri");
        }
      } else {
        // DEV MODE: Generate a short mock URI for local testing
        // In production, you MUST configure NEXT_PUBLIC_METADATA_UPLOAD_URL
        const mockHash = Math.random().toString(36).substring(2, 15);
        uri = `https://arweave.net/${mockHash}`;
        
        console.warn(
          "⚠️ DEV MODE: Using mock URI for testing. " +
          "Configure NEXT_PUBLIC_METADATA_UPLOAD_URL for production."
        );
        console.log("Mock metadata:", metadata);
      }

      // Safety: reject excessively long URIs (Rust side limits to ~200 chars)
      if (uri.length > 200) {
        throw new Error(`URI too long (${uri.length} chars, max 200). Use a URL shortener or configure proper IPFS/Arweave upload.`);
      }

      toast.success("Metadata uploaded!", { id: "upload" });
      return uri;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Upload failed:", error);
      toast.error("Upload failed: " + msg, { id: "upload" });
      return null;
    }
  };

  return { upload };
};
