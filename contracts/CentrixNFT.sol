// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts@5.0.2/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts@5.0.2/access/Ownable.sol";

/**
 * @title CentrixNFT
 * @dev Official Centrix Asset Badge - Exclusive on Monad Network
 */
contract CentrixNFT is ERC721, Ownable {
    uint256 public nextTokenId;

    // Strategic low-friction mint price: 0.001 MON (Budget & Student Friendly)
    uint256 public mintPrice = 0.001 ether; 

    // Base IPFS URI linked to your Pinata folder CID
    string private _baseTokenURI;

    constructor() ERC721("Centrix", "CNX") Ownable(msg.sender) {
        _baseTokenURI = "ipfs://bafybeigauvxl4std2kpjs2hm5zb7ca7zn7jhvomw2g6lrx45gldeo4orq4/"; 
    }

    function setMintPrice(uint256 _newPrice) external onlyOwner {
        mintPrice = _newPrice;
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }

    function mint(address to) external payable {
        require(msg.value >= mintPrice, "Centrix Mint: Insufficient payment (0.001 MON required)");
        _safeMint(to, nextTokenId++);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Centrix Mint: No funds to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Centrix Mint: Transfer failed");
    }
}
