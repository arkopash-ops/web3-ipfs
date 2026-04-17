// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract FileStorage{
    struct File{
        string cid;
        string name;
    }

    mapping (address => File[]) private files;

    function storeFile(string memory cid, string memory name) public {
        files[msg.sender].push(File(cid,name));
    }

    function getFiles(address user) public view returns (File[] memory) {
        return files[user];
    }
}
