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

  if (!mounted) return <div className="p-4 text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 font-mono">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl text-center font-bold tracking-wide text-green-400">
          Decentralized Storage
        </h1>

        {/* wallet connection */}
        <div className="border border-green-500/30 p-4 rounded-lg bg-black/40 backdrop-blur">
          {!isConnected ? (
            <button
              onClick={() => connect({ connector: injected() })}
              className="border border-green-400 px-4 py-1 rounded hover:bg-green-400 hover:text-black transition"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 break-all">{address}</p>
              <button
                onClick={() => disconnect()}
                className="border border-red-400 px-3 py-1 rounded hover:bg-red-400 hover:text-black transition"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* upload on ipfs */}
        <div className="border border-green-500/30 p-4 rounded-lg space-y-3 bg-black/40">
          <input
            type="file"
            className="text-sm text-gray-300"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={handleUpload}
            disabled={loading}
            className="border border-green-400 px-4 py-1 rounded hover:bg-green-400 hover:text-black transition disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>

        {/* cid of file */}
        {cid && (
          <div className="border border-green-500/30 p-4 rounded-lg bg-black/40">
            <p className="text-green-400 text-sm mb-1">CID</p>
            <p className="text-xs break-all text-gray-300">{cid}</p>
            <a
              href={`https://pinata.cloud/ipfs/${cid}`}
              target="_blank"
              className="text-green-400 text-xs underline"
            >
              Open File
            </a>
          </div>
        )}

        {/* view transaction on Etherscan */}
        {txHash && (
          <div className="border border-green-500/30 p-4 rounded-lg bg-black/40">
            <p className="text-green-400 text-sm mb-1">Transaction</p>
            <p className="text-xs break-all text-gray-300">{txHash}</p>
            <a
              href={`https://etherscan.io/tx/${txHash}`}
              target="_blank"
              className="text-green-400 text-xs underline"
            >
              View on Etherscan
            </a>
          </div>
        )}

        {/* Show all files */}
        <div>
          <h2 className="text-green-400 mb-2">Your Files</h2>
          <div className="space-y-2">
            {Array.isArray(files) && files.length > 0 ? (
              files.map((f, i) => (
                <a
                  key={i}
                  href={`https://pinata.cloud/ipfs/${f.cid}`}
                  target="_blank"
                  className="block border border-green-500/20 p-2 rounded text-sm hover:bg-green-400/10 transition"
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
