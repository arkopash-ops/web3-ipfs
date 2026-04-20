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
import { FileMetadata } from "@/types/File";

export default function Home() {
  const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY as string;

  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [fileCid, setFileCid] = useState("");
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);

  const [metaMap, setMetaMap] = useState<Record<string, FileMetadata>>({});

  useEffect(() => {
    (async () => setMounted(true))();
  }, []);

  const { address, isConnected } = useConnection();
  const { mutate: connect } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const { mutateAsync: writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const { data: files } = useReadContract({
    address: contractAddress,
    abi,
    functionName: "getFiles",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  }) as { data: { cid: string; fileName: string }[] | undefined };

  //Load metadata from IPFS using metadata CID stored on-chain
  useEffect(() => {
    const loadMetadata = async () => {
      if (!files) return;

      const map: Record<string, FileMetadata> = {};

      for (const f of files) {
        try {
          const res = await fetch(`https://${PINATA_GATEWAY}/ipfs/${f.cid}`);
          const data: FileMetadata = await res.json();
          map[f.cid] = data;
        } catch (err) {
          console.error("Failed to load metadata:", err);
        }
      }

      setMetaMap(map);
    };

    loadMetadata();
  }, [files, PINATA_GATEWAY]);

  // file -> IPFS
  // metadata -> IPFS
  // store metadataCID on-chain
  const handleUpload = async () => {
    if (!file || !isConnected || loading) return;

    try {
      setLoading(true);

      // first upload file to IPFS
      const uploadedFileCid = await uploadToIPFS(file);
      setFileCid(uploadedFileCid);

      const metadata: FileMetadata = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        description,
        tags,
        cid: uploadedFileCid,
        uploadedAt: Date.now(),
        walletAddress: address,
      };

      // convert metadata to file
      const metadataFile = new File(
        [JSON.stringify(metadata, null, 2)],
        "metadata.json",
        { type: "application/json" },
      );

      // Upload metadata JSON to IPFS
      const metadataCid = await uploadToIPFS(metadataFile);

      // Store metadata CID on blockchain
      const tx = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: "storeFile",
        args: [metadataCid, file.name],
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

  if (!mounted) {
    return <div className="p-4 text-gray-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-5">
          <h1 className="text-xl font-semibold text-green-400">
            Decentralized Storage
          </h1>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-4">
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
                  className="w-full py-2 rounded-lg border border-red-500 text-red-400 text-sm"
                >
                  Disconnect
                </button>
              </div>
            )}

            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs file:bg-neutral-800 file:text-white"
            />

            <input
              type="text"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-800 rounded text-sm"
            />

            <input
              type="text"
              placeholder="Tags (comma separated)"
              onChange={(e) =>
                setTags(
                  e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                )
              }
              className="w-full px-3 py-2 bg-neutral-800 rounded text-sm"
            />

            <button
              onClick={handleUpload}
              disabled={loading}
              className="w-full py-2 rounded-lg bg-green-500 text-black text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Uploading..." : "Upload"}
            </button>

            {/* file cid */}
            {fileCid && (
              <div className="text-xs bg-neutral-800 p-3 rounded-lg">
                <p className="text-green-400">File CID</p>
                <p className="break-all">{fileCid}</p>
                <a
                  href={`https://${PINATA_GATEWAY}/ipfs/${fileCid}`}
                  target="_blank"
                  className="text-green-400 underline"
                >
                  Open File
                </a>
              </div>
            )}

            {/* view transaction on Etherscan */}
            {txHash && (
              <div className="text-xs bg-neutral-800 p-3 rounded-lg">
                <p className="text-green-400">Transaction</p>
                <p className="break-all">{txHash}</p>
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

        <div>
          <h1 className="text-xl font-semibold text-green-400">Your Files</h1>

          <div className="space-y-2 max-h-125 overflow-y-auto pr-2">
            {Array.isArray(files) && files.length > 0 ? (
              files.map((f, i) => {
                const meta = metaMap[f.cid];

                return (
                  <a
                    key={i}
                    href={`https://${PINATA_GATEWAY}/ipfs/${meta?.cid}`}
                    target="_blank"
                    className="block text-sm bg-neutral-900 border border-neutral-800 px-3 py-2 rounded-lg hover:bg-neutral-800"
                  >
                    <div className="font-medium">{f.fileName}</div>

                    {meta && (
                      <div className="text-xs text-gray-400 mt-1 space-y-1">
                        <p>
                          {meta.fileType} - {(meta.fileSize / 1024).toFixed(2)}{" "}
                          KB
                        </p>
                        <p>{meta.description}</p>
                        <div className="flex gap-1 flex-wrap">
                          {meta.tags?.map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 bg-neutral-800 rounded text-[10px]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </a>
                );
              })
            ) : (
              <p className="text-xs text-gray-500">No files uploaded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
