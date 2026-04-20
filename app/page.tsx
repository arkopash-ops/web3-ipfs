"use client";

import { useEffect, useState } from "react";
import {
  useConnection,
  useConnect,
  useDisconnect,
  useWriteContract,
  useReadContract,
  usePublicClient,
} from "wagmi";
import { injected } from "wagmi/connectors";

import { uploadToIPFS } from "../lib/ipfs";
import { contractAddress, abi } from "../lib/contract";
import { FileType } from "@/types/File";

export default function Home() {
  const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY as string;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    (async () => setMounted(true))();
  }, []);

  const { address, isConnected } = useConnection();
  const { mutate: connect } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const { mutateAsync: writeContractAsync } = useWriteContract();

  const publicClient = usePublicClient();

  const [file, setFile] = useState<File | null>(null);
  const [cid, setCid] = useState("");
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: files } = useReadContract({
    address: contractAddress,
    abi,
    functionName: "getFiles",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  }) as { data: FileType[] | undefined };

  const handleUpload = async () => {
    if (!file || !isConnected) return;

    try {
      setLoading(true);
      const uploadedCid = await uploadToIPFS(file);
      setCid(uploadedCid);

      const tx = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: "storeFile",
        args: [uploadedCid, file.name],
      });

      setTxHash(tx);

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: tx });
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return <div className="p-4 text-gray-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-5">
          <h1 className="text-xl font-semibold text-green-400">
            Decentralized Storage
          </h1>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-4 shadow-sm">
            {/* wallet connection */}
            {!isConnected ? (
              <button
                onClick={() => connect({ connector: injected() })}
                className="w-full py-2 rounded-lg bg-green-500 text-black text-sm font-medium hover:bg-green-400 transition"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 break-all">{address}</p>
                <button
                  onClick={() => disconnect()}
                  className="w-full py-2 rounded-lg border border-red-500 text-red-400 text-sm hover:bg-red-500 hover:text-black transition"
                >
                  Disconnect
                </button>
              </div>
            )}

            {/* upload on ipfs */}
            <div className="space-y-2">
              <input
                type="file"
                className="w-full text-xs text-gray-300 file:mr-3 file:px-3 file:py-1 file:border file:border-neutral-700 file:rounded file:bg-neutral-800 file:text-white"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <button
                onClick={handleUpload}
                disabled={loading}
                className="w-full py-2 rounded-lg bg-green-500 text-black text-sm font-medium hover:bg-green-400 disabled:opacity-50 transition"
              >
                {loading ? "Uploading..." : "Upload"}
              </button>
            </div>

            {/* cid of file */}
            {cid && (
              <div className="text-xs bg-neutral-800 p-3 rounded-lg space-y-1">
                <p className="text-green-400">CID</p>
                <p className="break-all text-gray-300">{cid}</p>
                <a
                  href={`https://${PINATA_GATEWAY}/ipfs/${cid}`}
                  target="_blank"
                  className="text-green-400 underline"
                >
                  Open File
                </a>
              </div>
            )}

            {/* view transaction on Etherscan */}
            {txHash && (
              <div className="text-xs bg-neutral-800 p-3 rounded-lg space-y-1">
                <p className="text-green-400">Transaction</p>
                <p className="break-all text-gray-300">{txHash}</p>
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  className="text-green-400 underline"
                >
                  View on Etherscan
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Show all files */}
        <div>
          <h1 className="text-xl font-semibold text-green-400">Your Files</h1>
          <div className="space-y-2 max-h-125 overflow-y-auto pr-2">
            {Array.isArray(files) && files.length > 0 ? (
              files.map((f, i) => (
                <a
                  key={i}
                  href={`https://${PINATA_GATEWAY}/ipfs/${f.cid}`}
                  target="_blank"
                  className="block text-sm bg-neutral-900 border border-neutral-800 px-3 py-2 rounded-lg hover:bg-neutral-800 transition"
                >
                  {f.name}
                </a>
              ))
            ) : (
              <p className="text-xs text-gray-500">No files uploaded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
