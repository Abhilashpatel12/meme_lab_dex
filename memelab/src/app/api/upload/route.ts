import { NextResponse } from 'next/server';
import Irys from "@irys/sdk";

export async function POST(request: Request) {
  try {
    // 1. Parse Input
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;
    const symbol = formData.get("symbol") as string;
    const description = formData.get("description") as string;

    console.log("Received upload request:", { name, symbol, fileType: file?.type, fileSize: file?.size });

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!name || !symbol) return NextResponse.json({ error: "Name and symbol are required" }, { status: 400 });

    // 2. Setup Irys (Connect to Devnet)
    const network = "devnet"; 
    const token = "solana";
    const providerUrl = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || "https://api.devnet.solana.com";
    
    // Get Private Key from .env
    // Supports either:
    // - base58 string
    // - JSON array string (e.g. "[1,2,3,...]")
    const rawPrivateKey = process.env.SERVER_PRIVATE_KEY;
    if (!rawPrivateKey) return NextResponse.json({ error: "Server Key missing" }, { status: 500 });

    let key: string | Uint8Array = rawPrivateKey;
    const trimmedKey = rawPrivateKey.trim();
    if (trimmedKey.startsWith("[")) {
      try {
        const secretKeyArray = JSON.parse(trimmedKey);
        if (!Array.isArray(secretKeyArray)) throw new Error("SERVER_PRIVATE_KEY must be a JSON array");
        key = Uint8Array.from(secretKeyArray);
      } catch (e: any) {
        return NextResponse.json(
          { error: `Invalid SERVER_PRIVATE_KEY format: ${e?.message ?? String(e)}` },
          { status: 500 },
        );
      }
    }

    const irys = new Irys({
      network, 
      token,
      key,
      config: { providerUrl }, 
    });

    console.log("Irys initialized successfully");

    // 3. Prepare Image File
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("Image buffer prepared:", buffer.length, "bytes");

    // Check Balance & Fund if needed (Lazy Funding)
    const fileSize = buffer.length;
    // Estimate price for image + a small JSON file (add 1kb buffer)
    const price = await irys.getPrice(fileSize + 1000);
    const balance = await irys.getLoadedBalance();

    console.log("Balance check:", { price: price.toString(), balance: balance.toString() });

    if (balance.lt(price)) {
      console.log(`Funding Irys node with ${price} lamports...`);
      await irys.fund(price);
      console.log("Funding complete");
    }

    // 4. Upload IMAGE
    console.log("Starting image upload...");
    const imageReceipt = await irys.upload(buffer, {
        tags: [{ name: "Content-Type", value: file.type }]
    });
    const imageUrl = `https://gateway.irys.xyz/${imageReceipt.id}`;
    console.log("Image Uploaded:", imageUrl);

    // 5. Create & Upload METADATA JSON
    console.log("Starting metadata upload...");
    const metadata = {
        name: name,
        symbol: symbol,
        description: description,
        image: imageUrl // Link the image we just uploaded
    };

    const jsonString = JSON.stringify(metadata);
    const jsonReceipt = await irys.upload(jsonString, {
        tags: [{ name: "Content-Type", value: "application/json" }]
    });
    const metadataUri = `https://gateway.irys.xyz/${jsonReceipt.id}`;

    console.log("Final Metadata URI:", metadataUri);

    return NextResponse.json({ 
      success: true, 
      metadataUri: metadataUri 
    });

  } catch (error: any) {
    console.error("Upload Error (full):", error);
    console.error("Error stack:", error?.stack);
    console.error("Error type:", typeof error);
    const errorMessage = error?.message || error?.toString() || "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}