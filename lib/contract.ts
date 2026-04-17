export const contractAddress =
    "0x1D747B2f38000FFdf1D6090E354A3a4188C1aC1D";

export const abi = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            }
        ],
        "name": "getFiles",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "string",
                        "name": "cid",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "name",
                        "type": "string"
                    }
                ],
                "internalType": "struct FileStorage.File[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "cid",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "name",
                "type": "string"
            }
        ],
        "name": "storeFile",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;
