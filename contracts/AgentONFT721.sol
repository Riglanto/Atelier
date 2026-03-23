// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import { OApp, Origin, MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ERC721URIStorage } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract AgentONFT721 is OApp, ERC721URIStorage {
    uint256 private _nextTokenId;
    address public artist;

    error NotTokenOwner();

    event NFTSent(uint256 indexed tokenId, uint32 dstEid, address from);
    event NFTReceived(uint256 indexed tokenId, address to);

    constructor(
        address _endpoint,
        address _delegate,
        string memory _name,
        string memory _symbol
    ) OApp(_endpoint, _delegate) Ownable(_delegate) ERC721(_name, _symbol) {
        artist = _delegate;
    }

    function mint(address to, string calldata uri) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        return tokenId;
    }

    function sendNFT(
        uint256 tokenId,
        uint32 dstEid,
        bytes calldata options
    ) external payable {
        address tokenOwner = _requireOwned(tokenId);
        if (msg.sender != tokenOwner) revert NotTokenOwner();

        string memory uri = tokenURI(tokenId);
        _burn(tokenId);

        bytes memory payload = abi.encode(tokenId, msg.sender, uri);
        _lzSend(dstEid, payload, options, MessagingFee(msg.value, 0), payable(msg.sender));

        emit NFTSent(tokenId, dstEid, msg.sender);
    }

    function sendNFTTo(
        uint256 tokenId,
        address to,
        uint32 dstEid,
        bytes calldata options
    ) external payable {
        address tokenOwner = _requireOwned(tokenId);
        if (msg.sender != tokenOwner) revert NotTokenOwner();

        string memory uri = tokenURI(tokenId);
        _burn(tokenId);

        bytes memory payload = abi.encode(tokenId, to, uri);
        _lzSend(dstEid, payload, options, MessagingFee(msg.value, 0), payable(msg.sender));

        emit NFTSent(tokenId, dstEid, msg.sender);
    }

    function quoteSend(
        uint256 tokenId,
        uint32 dstEid,
        bytes calldata options
    ) external view returns (MessagingFee memory) {
        string memory uri = tokenURI(tokenId);
        bytes memory payload = abi.encode(tokenId, ownerOf(tokenId), uri);
        return _quote(dstEid, payload, options, false);
    }

    function _lzReceive(
        Origin calldata /*_origin*/,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        (uint256 tokenId, address to, string memory uri) = abi.decode(
            _message,
            (uint256, address, string)
        );

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit NFTReceived(tokenId, to);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721URIStorage) returns (string memory) {
        return ERC721URIStorage.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721URIStorage) returns (bool) {
        return ERC721URIStorage.supportsInterface(interfaceId);
    }
}
