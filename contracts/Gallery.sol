// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import { AgentONFT721 } from "./AgentONFT721.sol";
import { MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

contract Gallery {
    AgentONFT721 public nft;

    struct Listing {
        address seller;
        uint256 price;
    }

    mapping(uint256 => Listing) public listings;

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Sold(uint256 indexed tokenId, address indexed buyer, uint256 price);
    event SoldAndBridged(uint256 indexed tokenId, address indexed buyer, uint32 dstEid, uint256 price);
    event ListingCancelled(uint256 indexed tokenId);

    error NotListed();
    error InsufficientPayment();
    error NotTokenOwner();
    error InvalidPrice();

    constructor(address _nft) {
        nft = AgentONFT721(_nft);
    }

    function listForSale(uint256 tokenId, uint256 price) external {
        if (nft.ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (price == 0) revert InvalidPrice();

        listings[tokenId] = Listing(msg.sender, price);
        emit Listed(tokenId, msg.sender, price);
    }

    function cancelListing(uint256 tokenId) external {
        Listing memory listing = listings[tokenId];
        if (listing.seller != msg.sender) revert NotTokenOwner();

        delete listings[tokenId];
        emit ListingCancelled(tokenId);
    }

    function buy(uint256 tokenId) external payable {
        Listing memory listing = listings[tokenId];
        if (listing.seller == address(0)) revert NotListed();
        if (msg.value < listing.price) revert InsufficientPayment();

        delete listings[tokenId];

        nft.transferFrom(listing.seller, msg.sender, tokenId);

        payable(listing.seller).transfer(listing.price);

        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }

        emit Sold(tokenId, msg.sender, listing.price);
    }

    function buyAndBridge(
        uint256 tokenId,
        uint32 dstEid,
        bytes calldata options
    ) external payable {
        Listing memory listing = listings[tokenId];
        if (listing.seller == address(0)) revert NotListed();

        // Get bridge fee quote
        MessagingFee memory bridgeFee = nft.quoteSend(tokenId, dstEid, options);
        uint256 totalRequired = listing.price + bridgeFee.nativeFee;
        if (msg.value < totalRequired) revert InsufficientPayment();

        delete listings[tokenId];

        // Transfer NFT from seller to this contract
        nft.transferFrom(listing.seller, address(this), tokenId);

        // Bridge NFT to buyer on destination chain
        nft.sendNFTTo{value: bridgeFee.nativeFee}(tokenId, msg.sender, dstEid, options);

        // Pay seller
        payable(listing.seller).transfer(listing.price);

        // Refund excess
        uint256 excess = msg.value - totalRequired;
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }

        emit SoldAndBridged(tokenId, msg.sender, dstEid, listing.price);
    }
}
